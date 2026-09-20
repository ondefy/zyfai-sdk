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
  depositReconciliationEnvReady,
  pollUntil,
  setupFreshFundedUser,
} from "./utils";

/** Base USDC — above reconciliation floor (0.1 USDC) but below rebalance minimum (1.5 USDC). */
const CHAIN_ID = 8453;
const DEPOSIT_AMOUNT = 100_000n;
const FUNDING_ETH_AMOUNT = 20_000_000_000_000n;

describe.skipIf(!depositReconciliationEnvReady())(
  "deposit-reconciliation",
  { timeout: 480_000 },
  () => {
    it("credits an on-chain transfer when log_deposit is never called", async () => {
      const token = getDefaultTokenAddress(CHAIN_ID) as Address;
      const user = await setupFreshFundedUser({
        chain: base,
        token,
        depositAmount: DEPOSIT_AMOUNT,
        fundingEthAmount: FUNDING_ETH_AMOUNT,
        clientName: "deposit-reconciliation-integration",
      });

      const sdk = new ZyfaiSDK({
        apiKey: user.apiKey,
        executionApiUrl: LOCAL_EXECUTION_API_BASE_URL,
      });

      const acceptanceStart = Date.now();
      const userAddress = await sdk.connectAccount(user.privateKey, CHAIN_ID);
      const acceptanceMs = Date.now() - acceptanceStart;

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

      const transferMs = Date.now() - acceptanceStart;

      // Deliberately skip sdk.logDeposit — simulates partner transfer without registration.
      const { elapsedMs: terminalMs, value: positions } = await pollUntil(
        async () => sdk.getPositions(userAddress, CHAIN_ID),
        (next) => next.portfolio?.ownershipTransferred === true,
        {
          label: "cron-reconciled deposit credited and pool handover completed",
          timeoutMs: 420_000,
          intervalMs: 2_000,
        },
      );

      expect(positions.portfolio?.hasBalance).toBe(false);

      const onChainBalance = await publicClient.readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [wallet.address as Address],
      });
      expect(onChainBalance).toBeGreaterThanOrEqual(DEPOSIT_AMOUNT);

      const positionsAfter = await sdk.getPositions(userAddress, CHAIN_ID);
      expect(positionsAfter.portfolio?.ownershipTransferred).toBe(true);

      console.log(
        JSON.stringify({
          evidence: "deposit-reconciliation",
          userAddress,
          smartWallet: wallet.address,
          chainId: CHAIN_ID,
          txHash,
          depositAmount: DEPOSIT_AMOUNT.toString(),
          acceptanceMs,
          transferMs,
          terminalMs,
          funding: {
            ethAmount: FUNDING_ETH_AMOUNT.toString(),
            usdcAmount: DEPOSIT_AMOUNT.toString(),
            ...user.funding,
          },
        }),
      );
    });
  },
);
