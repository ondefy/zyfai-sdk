import { expect, it } from "vitest";
import type { Address } from "viem";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { ERC20_ABI } from "../config/abis";
import { getDefaultTokenAddress } from "../config/chains";
import { ZyfaiSDK } from "../core/ZyfaiSDK";
import {
  FRESH_FUNDED_USER_ETH_WEI,
  FRESH_FUNDED_USER_USDC_AMOUNT,
  describeIntegrationSuite,
  integrationFreshUserSdkConfig,
  logIntegrationEvidence,
  setupFreshFundedUser,
} from "./utils";

/** Base USDC — 0.1 USDC smoke; above reconciliation floor, below rebalance minimum. */
const CHAIN_ID = 8453;

describeIntegrationSuite(
  "send-deposit-wait-credit",
  {
    spendProfile: "spends_funds",
    credentialGate: "fresh_user",
    timeout: 480_000,
  },
  () => {
    it("sendDeposit registers handover_pending then waitForDepositCredit credits", async () => {
      const token = getDefaultTokenAddress(CHAIN_ID) as Address;
      const user = await setupFreshFundedUser({
        chain: base,
        token,
        depositAmount: FRESH_FUNDED_USER_USDC_AMOUNT,
        fundingEthAmount: FRESH_FUNDED_USER_ETH_WEI,
        clientName: "send-deposit-wait-credit-integration",
      });

      const sdk = new ZyfaiSDK(integrationFreshUserSdkConfig(user.apiKey));

      const userAddress = await sdk.connectAccount(user.privateKey, CHAIN_ID);

      const sendStart = Date.now();
      const sent = await sdk.sendDeposit(
        userAddress,
        CHAIN_ID,
        FRESH_FUNDED_USER_USDC_AMOUNT.toString(),
        "USDC",
      );
      const acceptanceMs = Date.now() - sendStart;

      expect(sent.success).toBe(true);
      expect(sent.txHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
      expect(sent.smartWallet).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(sent.amount).toBe(FRESH_FUNDED_USER_USDC_AMOUNT.toString());
      expect(sent.registration.id).toBeTruthy();
      expect(sent.registration.status).toBe("handover_pending");
      expect(sent.registration.balanceCredited).toBe(false);
      expect(sent.registration.statusUrl).toContain(sent.registration.id);

      const watchStart = Date.now();
      const credited = await sdk.waitForDepositCredit(
        sent.registration.id,
        CHAIN_ID,
      );
      const terminalMs = Date.now() - watchStart;

      expect(credited.status).toBe("credited");
      expect(credited.balanceCredited).toBe(true);
      expect(credited.id).toBe(sent.registration.id);

      const positions = await sdk.getPositions(userAddress, CHAIN_ID);
      expect(positions.portfolio?.ownershipTransferred).toBe(true);

      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      });
      const onChainBalance = await publicClient.readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [sent.smartWallet as Address],
      });
      expect(onChainBalance).toBeGreaterThanOrEqual(FRESH_FUNDED_USER_USDC_AMOUNT);

      logIntegrationEvidence("send-deposit-wait-credit", {
        depositId: sent.registration.id,
        userAddress,
        smartWallet: sent.smartWallet,
        chainId: CHAIN_ID,
        txHash: sent.txHash,
        depositAmount: FRESH_FUNDED_USER_USDC_AMOUNT.toString(),
        acceptanceMs,
        terminalMs,
        statusTransitions: {
          acceptance: sent.registration.status,
          terminal: credited.status,
        },
        funding: user.funding,
      });
    });
  },
);
