import { expect, it } from "vitest";
import type { Address } from "viem";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { ERC20_ABI } from "../config/abis";
import { getDefaultTokenAddress } from "../config/chains";
import { ZyfaiSDK } from "../core/ZyfaiSDK";
import {
  describeIntegrationSuite,
  integrationSdkConfig,
  integrationSmokeUsdcAmount,
  logIntegrationEvidence,
} from "./utils";

const CHAIN_ID = 8453;
const ASSET = "USDC";

describeIntegrationSuite(
  "deposit-withdraw-lifecycle",
  { spendProfile: "spends_funds", timeout: 480_000 },
  () => {
    it("polls deposit position and withdraw lifecycle through completion", async () => {
      const token = getDefaultTokenAddress(CHAIN_ID) as Address;
      const sdk = new ZyfaiSDK(integrationSdkConfig());

      const userAddress = await sdk.connectAccount(
        process.env.PRIVATE_KEY!,
        CHAIN_ID,
      );

      const wallet = await sdk.getSmartWalletAddress(userAddress, CHAIN_ID);
      expect(wallet.address).toMatch(/^0x[0-9a-fA-F]{40}$/);

      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      });
      const safeUsdcBefore = await publicClient.readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [wallet.address as Address],
      });

      const depositAmount = integrationSmokeUsdcAmount(
        CHAIN_ID,
        ASSET,
        safeUsdcBefore,
      );

      const depositAcceptStart = Date.now();
      const sent = await sdk.sendDeposit(
        userAddress,
        CHAIN_ID,
        depositAmount.toString(),
        ASSET,
      );
      const depositAcceptanceMs = Date.now() - depositAcceptStart;

      expect(sent.success).toBe(true);
      expect(sent.registration.status).toBe("handover_pending");

      const creditStart = Date.now();
      const credited = await sdk.waitForDepositCredit(
        sent.registration.id,
        CHAIN_ID,
      );
      const depositCreditMs = Date.now() - creditStart;

      // Allocation can start right after credit, so the first credited poll may already be past "credited".
      expect(["credited", "position_pending", "positioned"]).toContain(
        credited.status,
      );
      expect(credited.balanceCredited).toBe(true);

      const positionStart = Date.now();
      const positioned = await sdk.waitForDepositPosition(
        sent.registration.id,
        CHAIN_ID,
      );
      const depositPositionMs = Date.now() - positionStart;

      expect(
        positioned.status === "positioned" ||
          positioned.positionOutcome === "skipped",
      ).toBe(true);

      const withdrawAcceptStart = Date.now();
      const withdrawn = await sdk.withdrawFunds(
        userAddress,
        CHAIN_ID,
        depositAmount.toString(),
        ASSET,
      );
      const withdrawAcceptanceMs = Date.now() - withdrawAcceptStart;

      expect(withdrawn.success).toBe(true);
      expect(withdrawn.lifecycle?.id).toBeTruthy();
      expect(withdrawn.lifecycle?.statusUrl).toContain(withdrawn.lifecycle!.id);

      const withdrawalId = withdrawn.lifecycle!.id;

      const withdrawSettleStart = Date.now();
      const settled = await sdk.waitForWithdrawSettlement(
        withdrawalId,
        CHAIN_ID,
      );
      const withdrawSettlementMs = Date.now() - withdrawSettleStart;

      expect(
        settled.status === "completed" ||
          settled.status === "async_cooldown" ||
          settled.status === "async_claiming",
      ).toBe(true);

      let withdrawTerminalStatus = settled.status;
      let withdrawCompleteMs = 0;

      if (
        settled.status === "async_cooldown" ||
        settled.status === "async_claiming"
      ) {
        const completeStart = Date.now();
        const completed = await sdk.waitForWithdrawComplete(
          withdrawalId,
          CHAIN_ID,
        );
        withdrawCompleteMs = Date.now() - completeStart;
        withdrawTerminalStatus = completed.status;
        expect(completed.status).toBe("completed");
      } else {
        expect(settled.status).toBe("completed");
      }

      logIntegrationEvidence("deposit-withdraw-lifecycle", {
        depositId: sent.registration.id,
        withdrawalId,
        userAddress,
        smartWallet: sent.smartWallet,
        chainId: CHAIN_ID,
        depositAmount: depositAmount.toString(),
        depositTxHash: sent.txHash,
        depositAcceptanceMs,
        depositCreditMs,
        depositPositionMs,
        withdrawAcceptanceMs,
        withdrawSettlementMs,
        withdrawCompleteMs,
        depositPositionStatus: positioned.status,
        depositPositionOutcome: positioned.positionOutcome ?? null,
        withdrawTerminalStatus,
        statusTransitions: {
          depositAcceptance: sent.registration.status,
          depositCredit: credited.status,
          depositPosition: positioned.status,
          withdrawAcceptance: withdrawn.lifecycle?.status ?? null,
          withdrawSettlement: settled.status,
          withdrawTerminal: withdrawTerminalStatus,
        },
      });
    });
  },
);
