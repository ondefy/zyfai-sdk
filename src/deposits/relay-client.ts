import {
  MAINNET_RELAY_API,
  convertViemChainToRelayChain,
  createClient,
  getClient,
} from "@relayprotocol/relay-sdk";
import { arbitrum, base, mainnet } from "viem/chains";

const RELAY_FUNDING_CHAIN_IDS = [mainnet.id, base.id, arbitrum.id] as const;

const clientHasFundingChains = (): boolean => {
  const client = getClient();
  if (!client?.baseApiUrl) return false;
  return RELAY_FUNDING_CHAIN_IDS.every((chainId) =>
    client.chains.some((chain) => chain.id === chainId),
  );
};

/** Relay `execute` needs a client that knows every chain a deposit quote may use. */
export const ensureRelaySdkClient = (): void => {
  if (clientHasFundingChains()) return;
  createClient({
    baseApiUrl: MAINNET_RELAY_API,
    source: "zyf.ai",
    chains: [mainnet, base, arbitrum].map(convertViemChainToRelayChain),
  });
};
