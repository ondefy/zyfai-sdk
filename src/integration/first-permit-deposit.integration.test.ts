import { expect, it } from "vitest";
import { createPublicClient, getAddress, http } from "viem";
import { base } from "viem/chains";
import { getDefaultTokenAddress } from "../config/chains";
import { ZyfaiSDK } from "../core/ZyfaiSDK";
import {
  FRESH_FUNDED_USER_USDC_AMOUNT,
  describeIntegrationSuite,
  integrationFreshUserSdkConfig,
  logIntegrationEvidence,
  setupFreshFundedUser,
} from "./utils";

const CHAIN_ID = 8453;

describeIntegrationSuite(
  "first-permit-deposit",
  { spendProfile: "spends_funds", credentialGate: "fresh_user", timeout: 480_000 },
  () => {
    it("sponsors the first Base USDC deposit from an EOA with zero native gas", async () => {
      const token = getAddress(getDefaultTokenAddress(CHAIN_ID));
      const user = await setupFreshFundedUser({
        chain: base,
        token,
        depositAmount: FRESH_FUNDED_USER_USDC_AMOUNT,
        fundingEthAmount: 0n,
        clientName: "first-permit-deposit-integration",
      });
      const sdk = new ZyfaiSDK(integrationFreshUserSdkConfig(user.apiKey));
      const owner = await sdk.connectAccount(user.privateKey, CHAIN_ID);
      const sent = await sdk.sendDeposit(owner, CHAIN_ID, FRESH_FUNDED_USER_USDC_AMOUNT.toString(), "USDC");
      const intent = await sdk.getFirstPermitDepositStatus(owner);
      const credited = await sdk.waitForDepositCredit(sent.registration.id, CHAIN_ID);
      const publicClient = createPublicClient({ chain: base, transport: http() });

      expect(intent).toMatchObject({
        status: "registered", depositId: credited.id, txHash: sent.txHash, token,
      });
      expect(credited.balanceCredited).toBe(true);
      expect(await publicClient.getBalance({ address: owner })).toBe(0n);

      logIntegrationEvidence("first-permit-deposit", {
        chainId: CHAIN_ID, userAddress: owner, smartWallet: sent.smartWallet,
        txHash: sent.txHash, depositId: credited.id, permitIntentId: intent?.id,
      });
    });
  },
);
