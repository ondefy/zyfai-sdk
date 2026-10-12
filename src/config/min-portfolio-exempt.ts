/**
 * Mainnet portfolio minimum waived for one POC wallet.
 * EOA 0x2db791F63C8b12BDe9A3fe31aFA8ad491F47d60F
 * Safe 0xAe72CB0F7d604a8FF742D96031104506186638E3
 * Other addresses keep MIN_PORTFOLIO_BALANCE / MIN_PORTFOLIO_USD.
 */
const MAINNET_MIN_PORTFOLIO_EXEMPT_ADDRESSES = new Set([
  "0x2db791f63c8b12bde9a3fe31afa8ad491f47d60f",
  "0xae72cb0f7d604a8ff742d96031104506186638e3",
]);

export function isMainnetMinPortfolioExempt(
  chainId: number,
  ...addresses: Array<string | null | undefined>
): boolean {
  if (chainId !== 1) {
    return false;
  }
  return addresses.some(
    (address) =>
      typeof address === "string" &&
      MAINNET_MIN_PORTFOLIO_EXEMPT_ADDRESSES.has(address.toLowerCase()),
  );
}
