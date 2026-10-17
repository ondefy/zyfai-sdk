export type CollateralQuote = {
  details?: {
    currencyOut?: {
      amount?: string;
      minimumAmount?: string;
    };
  };
};

const positiveUnits = (value: string | null | undefined): string | null => {
  if (!value || value === "0") return null;
  return value;
};

/**
 * Destination-collateral least units for the portfolio floor.
 * A stored order minimum wins. Otherwise the refreshed Relay quote's
 * `currencyOut` amounts are already in the destination token.
 */
export const resolveCollateralMinimum = (
  storedMinimum: string | null | undefined,
  quote: CollateralQuote,
): string =>
  positiveUnits(storedMinimum) ??
  positiveUnits(quote.details?.currencyOut?.minimumAmount) ??
  positiveUnits(quote.details?.currencyOut?.amount) ??
  "0";
