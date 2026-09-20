import { describe, expect, it } from "vitest";
import type { Address } from "viem";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { ERC20_ABI } from "../config/abis";
import { getDefaultTokenAddress } from "../config/chains";
import { LOCAL_EXECUTION_API_BASE_URL } from "../config/endpoints";
import { ZyfaiSDK } from "../core/ZyfaiSDK";
import {
  freshFundedUserEnvReady,
  pollUntil,
  setupFreshFundedUser,
} from "./utils";

/** Base USDC — above reconciliation floor (0.1 USDC) but below rebalance minimum (1.5 USDC). */
const CHAIN_ID = 8453;
const DEPOSIT_AMOUNT = 100_000n;
const FUNDING_ETH_AMOUNT = 20_000_000_000_000n;
/** Old sync path blocked on pool handover (~8s prod); acceptance should stay well under this. */
const ACCEPTANCE_SLO_MS = 8_000;

describe.skipIf(!freshFundedUserEnvReady())(
  "wallet-v-async-deposit",
  { timeout: 480_000 },
  () => {
    it("accepts log_deposit quickly then credits after async handover", async () => {
      const token = getDefaultTokenAddress(CHAIN_ID) as Address;
      const user = await setupFreshFundedUser({
        chain: base,
        token,
        depositAmount: DEPOSIT_AMOUNT,
        fundingEthAmount: FUNDING_ETH_AMOUNT,
        clientName: "wallet-v-async-deposit-integration",
      });

      const sdk = new ZyfaiSDK({
        apiKey: user.apiKey,
        executionApiUrl: LOCAL_EXECUTION_API_BASE_URL,
      });

      const userAddress = await sdk.connectAccount(user.privateKey, CHAIN_ID);
      const wallet = await sdk.getSmartWalletAddress(userAddress, CHAIN_ID);
      expect(wallet.address).toMatch(/^0x[0-9a-fA-F]{40}$/);

      const account = privateKeyToAccount(user.privateKey);
      const walletClient = createWalletClient({
        account,
        chain: base,
        transport: http(),
      });
      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      });

      const txHash = await walletClient.writeContract({
        address: token,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [wallet.address as Address, DEPOSIT_AMOUNT],
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });
      expect(receipt.status).toBe("success");

      const acceptanceStart = Date.now();
      const registration = await sdk.logDeposit(
        CHAIN_ID,
        txHash,
        DEPOSIT_AMOUNT.toString(),
      );
      const acceptanceMs = Date.now() - acceptanceStart;

      expect(registration.success).toBe(true);
      expect(registration.deposit.id).toBeTruthy();
      expect(registration.deposit.status).toBe("handover_pending");
      expect(registration.deposit.balanceCredited).toBe(false);
      expect(registration.deposit.statusUrl).toContain(registration.deposit.id);
      expect(acceptanceMs).toBeLessThan(ACCEPTANCE_SLO_MS);

      const { elapsedMs: terminalMs, value: credited } = await pollUntil(
        () => sdk.getDepositStatus(registration.deposit.id),
        (status) =>
          status.status === "credited" && status.balanceCredited === true,
        {
          label: "deposit handover credited",
          timeoutMs: 420_000,
          intervalMs: 2_000,
        },
      );

      expect(credited.status).toBe("credited");
      expect(credited.balanceCredited).toBe(true);
      expect(terminalMs).toBeGreaterThan(0);
      expect(acceptanceMs).toBeLessThan(terminalMs);

      const replay = await sdk.logDeposit(
        CHAIN_ID,
        txHash,
        DEPOSIT_AMOUNT.toString(),
      );
      expect(replay.deposit.id).toBe(registration.deposit.id);

      const positions = await sdk.getPositions(userAddress, CHAIN_ID);
      expect(positions.portfolio?.ownershipTransferred).toBe(true);

      const onChainBalance = await publicClient.readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [wallet.address as Address],
      });
      expect(onChainBalance).toBeGreaterThanOrEqual(DEPOSIT_AMOUNT);

      console.log(
        JSON.stringify({
          evidence: "wallet-v-async-deposit",
          depositId: registration.deposit.id,
          userAddress,
          smartWallet: wallet.address,
          chainId: CHAIN_ID,
          txHash,
          depositAmount: DEPOSIT_AMOUNT.toString(),
          acceptanceMs,
          terminalMs,
          statusTransitions: {
            acceptance: registration.deposit.status,
            terminal: credited.status,
          },
        }),
      );
    });
  },
);
