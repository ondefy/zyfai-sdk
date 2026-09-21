const PRICE_SCALE = 8;

export interface TokenPriceResponse {
  success?: boolean;
  data?: {
    token_id?: string;
    price_usd?: number;
  };
}

/**
 * Read a USD price from Data API `/price?token=<id>`.
 */
export const parseTokenUsdPrice = (response: TokenPriceResponse): number => {
  const priceUsd = response?.data?.price_usd;
  if (typeof priceUsd !== "number" || !Number.isFinite(priceUsd) || priceUsd <= 0) {
    throw new Error("Token USD price must be a positive number");
  }
  return priceUsd;
};

/**
 * Convert a USD amount to a token's least units at the given USD price.
 *
 * Used for minimums quoted in dollars (WETH, NVDAc) so the on-chain threshold
 * tracks the market instead of being pinned to a hardcoded wei value.
 */
export const usdToTokenUnits = (
  usdAmount: bigint,
  priceUsd: number,
  decimals: number
): bigint => {
  if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
    throw new Error("Token USD price must be positive");
  }
  const scaledPrice = BigInt(Math.round(priceUsd * 10 ** PRICE_SCALE));
  if (scaledPrice <= 0n) {
    throw new Error("Token USD price must be positive");
  }
  return (
    (usdAmount * 10n ** BigInt(decimals) * 10n ** BigInt(PRICE_SCALE)) /
    scaledPrice
  );
};
