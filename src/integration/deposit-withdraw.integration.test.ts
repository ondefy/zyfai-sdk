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
  "deposit-withdraw",
  { spendProfile: "spends_funds", timeout: 480_000 },
  () => {
    it("sendDeposit credits then withdrawFunds returns success", async () => {
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

      const sendStart = Date.now();
      const sent = await sdk.sendDeposit(
        userAddress,
        CHAIN_ID,
        depositAmount.toString(),
        ASSET,
      );
      const acceptanceMs = Date.now() - sendStart;

      expect(sent.success).toBe(true);
      expect(sent.registration.status).toBe("handover_pending");
      expect(sent.registration.balanceCredited).toBe(false);

      const creditStart = Date.now();
      const credited = await sdk.waitForDepositCredit(
        sent.registration.id,
        CHAIN_ID,
      );
      const creditMs = Date.now() - creditStart;

      expect(credited.status).toBe("credited");
      expect(credited.balanceCredited).toBe(true);

      const withdrawStart = Date.now();
      const withdrawn = await sdk.withdrawFunds(
        userAddress,
        CHAIN_ID,
        depositAmount.toString(),
        ASSET,
      );
      const withdrawMs = Date.now() - withdrawStart;

      expect(withdrawn.success).toBe(true);

      logIntegrationEvidence("deposit-withdraw", {
        depositId: sent.registration.id,
        userAddress,
        smartWallet: sent.smartWallet,
        chainId: CHAIN_ID,
        depositAmount: depositAmount.toString(),
        depositTxHash: sent.txHash,
        acceptanceMs,
        creditMs,
        withdrawMs,
        withdrawType: withdrawn.type,
        withdrawTxHash: withdrawn.txHash ?? null,
        statusTransitions: {
          acceptance: sent.registration.status,
          terminal: credited.status,
        },
      });
    });
  },
);
