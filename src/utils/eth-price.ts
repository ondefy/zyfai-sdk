const PRICE_SCALE = 8;

export interface TokenPriceResponse {
  success?: boolean;
  data?: {
    token_id?: string;
    price_usd?: number;
  };
}

/**
 * Read ETH/USD from Data API `/price?token=eth`.
 */
export const parseEthUsdPrice = (response: TokenPriceResponse): number => {
  const priceUsd = response?.data?.price_usd;
  if (typeof priceUsd !== "number" || !Number.isFinite(priceUsd) || priceUsd <= 0) {
    throw new Error("ETH/USD price must be a positive number");
  }
  return priceUsd;
};

/**
 * Convert a USD amount to WETH wei using a USD-per-ETH float.
 */
export const usdToWethWei = (usdAmount: bigint, ethUsd: number): bigint => {
  if (!Number.isFinite(ethUsd) || ethUsd <= 0) {
    throw new Error("ETH/USD price must be positive");
  }
  const scaledPrice = BigInt(Math.round(ethUsd * 10 ** PRICE_SCALE));
  if (scaledPrice <= 0n) {
    throw new Error("ETH/USD price must be positive");
  }
  return (usdAmount * 10n ** 18n * 10n ** BigInt(PRICE_SCALE)) / scaledPrice;
};

export const minWethWeiForUsd = (
  ethUsd: number,
  usdAmount: bigint
): bigint => usdToWethWei(usdAmount, ethUsd);
