import { describe, expect, it } from "vitest";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { SupportedChainId } from "../config/chains";
import {
  ACCEPTANCE_SLO_MS,
  getChain,
  integrationEnvReady,
  LOCAL_EXECUTION_API_URL,
  POLL_INTERVAL_MS,
  sleep,
  TERMINAL_SLO_MS,
} from "./utils";

const CHAIN_ID = 8453 as SupportedChainId;
/** 0.1 USDC (6 decimals) */
const DEPOSIT_AMOUNT = "100000";

describe.skipIf(!integrationEnvReady())(
  "wallet-v-async-deposit",
  { timeout: 180_000 },
  () => {
    it("accepts log_deposit quickly then credits via async handover", async () => {
      const { ZyfaiSDK } = await import("../core/ZyfaiSDK");
      const chainId = CHAIN_ID;
      const amount = DEPOSIT_AMOUNT;
      const privateKey = process.env.PRIVATE_KEY! as Hex;
      const account = privateKeyToAccount(privateKey);
      const userAddress = account.address;

      const chain = getChain(chainId);
      const publicClient = createPublicClient({ chain, transport: http() });
      const walletClient = createWalletClient({
        account,
        chain,
        transport: http(),
      });

      const sdk = new ZyfaiSDK({
        apiKey: process.env.ZYFAI_API_KEY!,
        executionApiUrl: LOCAL_EXECUTION_API_URL,
      });

      await sdk.connectAccount(privateKey, chainId);

      const intent = await sdk.buildDepositTransfer({
        userAddress,
        chainId,
        amount,
        asset: "USDC",
      });

      const txHash = await walletClient.writeContract({
        address: intent.to,
        abi: [
          {
            name: "transfer",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [
              { name: "to", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            outputs: [{ type: "bool" }],
          },
        ],
        functionName: "transfer",
        args: [intent.safeAddress as Address, BigInt(amount)],
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });

      const registrationStarted = Date.now();
      const registration = await sdk.logDeposit(
        chainId,
        txHash,
        amount,
        intent.tokenAddress
      );
      const acceptanceMs = Date.now() - registrationStarted;

      expect(registration.success).toBe(true);
      expect(registration.deposit.status).toBe("handover_pending");
      expect(registration.deposit.balanceCredited).toBe(false);
      expect(acceptanceMs).toBeLessThan(ACCEPTANCE_SLO_MS);

      const terminalStarted = Date.now();
      let terminalStatus = registration.deposit.status;
      let balanceCredited = registration.deposit.balanceCredited;

      while (Date.now() - terminalStarted < TERMINAL_SLO_MS) {
        const status = await sdk.getDepositStatus(registration.deposit.id);
        terminalStatus = status.status;
        balanceCredited = status.balanceCredited;
        if (terminalStatus === "credited" && balanceCredited) break;
        await sleep(POLL_INTERVAL_MS);
      }

      const terminalMs = Date.now() - terminalStarted;

      expect(terminalStatus).toBe("credited");
      expect(balanceCredited).toBe(true);

      const replay = await sdk.logDeposit(
        chainId,
        txHash,
        amount,
        intent.tokenAddress
      );
      expect(replay.deposit.id).toBe(registration.deposit.id);

      console.log(
        JSON.stringify({
          feature: "wallet-v-async-deposit",
          depositId: registration.deposit.id,
          txHash,
          acceptanceMs,
          terminalMs,
          statusTransitions: `handover_pending -> ${terminalStatus}`,
        })
      );
    });
  }
);
