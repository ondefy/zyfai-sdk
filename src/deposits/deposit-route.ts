import { ASSET_CONFIGS, getAssetChainIds } from "../config/chains";
import type { SupportedChainId } from "../config/chains";

/** Native asset placeholder Relay and the execution API both accept. */
export const NATIVE_CURRENCY = "0x0000000000000000000000000000000000000000";

/**
 * Dashboard collaterals the execution API will quote through Relay.
 * Keys match `RELAY_DESTINATION_ASSETS` in zyfai-api.
 */
export const RELAY_DESTINATION_ASSETS = [
  "USDC",
  "WETH",
  "CBBTC",
  "WBTC",
  "EURC",
  "USDT",
  "PYUSD",
  "NVDAC",
  "GOOGLC",
  "AAPLC",
  "METAC",
] as const;

export type DepositRoute =
  | { kind: "direct"; asset: string }
  | { kind: "wrap"; asset: "WETH" }
  | {
      kind: "swap";
      originChainId: number;
      originCurrency: string;
      destinationAsset: string;
    };

export type DepositRouteInput = {
  /** Chain the collateral should arrive on. */
  chainId: number;
  /** Collateral symbol that should land in the Safe. */
  asset: string;
  /**
   * Token the wallet spends. Omit to spend `asset` on `chainId`.
   * A symbol or contract equal to that collateral on `chainId` is a direct deposit.
   */
  spendToken?: string;
  /** Chain the spend token is on. Defaults to `chainId`. */
  spendChainId?: number;
};

const lookupCollateral = (asset: string): string | null =>
  Object.keys(ASSET_CONFIGS).find(
    (key) => key.toLowerCase() === asset.toLowerCase(),
  ) ?? null;

export const toRelayDestinationAsset = (asset: string): string =>
  asset.trim().toUpperCase();

export const isNativeSpendToken = (token: string): boolean => {
  const value = token.trim().toLowerCase();
  return value === "eth" || value === "native" || value === NATIVE_CURRENCY;
};

const isSameCollateralToken = (
  spend: string,
  collateral: string,
  chainId: number,
): boolean => {
  if (spend.toLowerCase() === collateral.toLowerCase()) return true;
  const address = ASSET_CONFIGS[collateral]?.addresses?.[chainId] as
    | string
    | undefined;
  return !!address && spend.toLowerCase() === address.toLowerCase();
};

const originCurrencyForSpend = (spend: string, chainId: number): string => {
  if (isNativeSpendToken(spend)) return NATIVE_CURRENCY;
  if (/^0x[0-9a-fA-F]{40}$/.test(spend)) return spend;
  const collateral = lookupCollateral(spend);
  if (!collateral) {
    throw new Error(
      `spendToken must be a collateral symbol or a token contract address. Received "${spend}".`,
    );
  }
  const address = ASSET_CONFIGS[collateral]?.addresses?.[chainId] as
    | string
    | undefined;
  if (!address) {
    throw new Error(`${collateral} is not available on chain ${chainId}.`);
  }
  return address;
};

/**
 * Choose a direct collateral transfer, a same-chain ETH wrap, or a Relay swap.
 *
 * A direct deposit is only when the wallet already holds the destination
 * collateral on the destination chain. Any other spend token is a swap.
 * Same-chain native ETH into WETH wraps in the wallet: Relay rejects that pair.
 */
export const resolveDepositRoute = (
  input: DepositRouteInput,
): DepositRoute => {
  const asset = input.asset?.trim();
  if (!asset) throw new Error("Asset is required");

  const spendChainId = input.spendChainId ?? input.chainId;
  const collateral = lookupCollateral(asset);
  const spend = input.spendToken?.trim();
  const holdsDestinationCollateral =
    !spend ||
    (spendChainId === input.chainId &&
      !!collateral &&
      isSameCollateralToken(spend, collateral, input.chainId));

  if (holdsDestinationCollateral) {
    if (!collateral) {
      throw new Error(
        `${asset} cannot be transferred directly. Pass spendToken to swap another token into it.`,
      );
    }
    const chains = getAssetChainIds(collateral);
    if (!chains.includes(input.chainId as SupportedChainId)) {
      throw new Error(
        `${collateral} is not available on chain ${input.chainId}. Supported chains: ${chains.join(", ")}.`,
      );
    }
    return { kind: "direct", asset: collateral };
  }

  if (
    collateral === "WETH" &&
    spendChainId === input.chainId &&
    spend &&
    isNativeSpendToken(spend)
  ) {
    return { kind: "wrap", asset: "WETH" };
  }

  const destinationAsset = toRelayDestinationAsset(asset);
  if (
    !RELAY_DESTINATION_ASSETS.includes(
      destinationAsset as (typeof RELAY_DESTINATION_ASSETS)[number],
    )
  ) {
    throw new Error(
      `${asset} is not a collateral Relay can deliver. Supported: ${RELAY_DESTINATION_ASSETS.join(", ")}.`,
    );
  }

  return {
    kind: "swap",
    originChainId: spendChainId,
    originCurrency: originCurrencyForSpend(spend!, spendChainId),
    destinationAsset,
  };
};
