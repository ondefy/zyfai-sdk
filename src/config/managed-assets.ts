import type { SupportedAsset } from "../types";
import { ASSET_CONFIGS } from "./chains";

const MANAGED_ASSET_ORDER: SupportedAsset[] = [
  "USDC",
  "WETH",
  "EURC",
  "USDT",
  "PYUSD",
  "NVDAc",
];

/**
 * Assets the agent manages for pause, resume, first-deposit protocol setup,
 * and bulk strategy changes. Derived from {@link ASSET_CONFIGS} where
 * `enabled === true`, with a stable product order for known symbols.
 */
export function getManagedAssets(): SupportedAsset[] {
  const enabled = Object.entries(ASSET_CONFIGS)
    .filter(([, config]) => config?.enabled === true)
    .map(([key]) => key as SupportedAsset);

  const ordered = MANAGED_ASSET_ORDER.filter((symbol) =>
    enabled.includes(symbol),
  );
  const remainder = enabled
    .filter((symbol) => !MANAGED_ASSET_ORDER.includes(symbol))
    .sort((a, b) => a.localeCompare(b));

  return [...ordered, ...remainder];
}
