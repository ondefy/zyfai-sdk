/**
 * Predeployment (pool) module addresses — reference constants.
 *
 * These mirror the ERC-7579 module set that ZyFi's predeployment service installs
 * on a pool smart account. Source of truth: the predeployment repo
 * `src/infrastructure/chain/modules.ts` — keep these in sync with it.
 *
 * FOR PARITY / VALIDATION AND DOCUMENTATION ONLY. The SDK does not install
 * modules on-chain: legacy wallets are deployed by the backend (SAFE_DEPLOY) and
 * predeployed wallets are provisioned by the pool. Nothing in the SDK reads these
 * to build, sign, or derive transactions. They are hardcoded (not recomputed via
 * `@rhinestone/module-sdk`) on purpose — see SMART_SESSIONS_VALIDATOR below.
 */
import type { Address } from "viem";

/**
 * Classic SmartSessions validator (installed empty, session enabled later).
 *
 * IMPORTANT: this address is VERSION-DEPENDENT. The pool runs
 * `@rhinestone/module-sdk` 0.4.0, which yields this address; the SDK's local
 * 0.2.11 yields the older `0x00000000002B0eCfbD0496EE71e01257dA0E37DE`. We pin
 * the pool's value so the two never silently diverge.
 */
export const SMART_SESSIONS_VALIDATOR =
  "0x00000000008bDABA73cD9815d79069c247Eb4bDA" as Address;

/** ERC-7739 compatibility fallback (selector 0x84b0196e). */
export const SMART_SESSIONS_FALLBACK =
  "0x12cae64c42f362e7d5a847c2d33388373f629177" as Address;

/** Intent (SmartSession v1) executor. */
export const INTENT_EXECUTOR =
  "0x00000000005aD9ce1f5035FD62CA96CEf16AdAAF" as Address;

/** Proxy executor used by the intent / omni-account session profile. */
export const PROXY_EXECUTOR =
  "0xF659d30D4EB88B06A909F20839D8959Bd77d8790" as Address;

/** Intent smart-sessions validator — the emissary the pool enables via setConfig. */
export const INTENT_SMART_SESSIONS =
  "0xad568b3f825a8d5ffc06dd3253526b64d810ae89" as Address;

/** OwnableValidator — the module whose owner set is rotated to the user on deposit. */
export const OWNABLE_VALIDATOR =
  "0x000000000013fdB5234E4E3162a810F54d9f7E98" as Address;

/** Safe 7579 adapter — matches the pool; already used by the SDK for deploys. */
export const SAFE_7579_ADDRESS =
  "0x7579EE8307284F293B1927136486880611F20002" as Address;

/** ERC-7579 launchpad — matches the pool; already used by the SDK for deploys. */
export const ERC7579_LAUNCHPAD_ADDRESS =
  "0x7579011aB74c46090561ea277Ba79D510c6C00ff" as Address;

/**
 * The full module set a predeployed (pool) wallet carries, for validation.
 * Mirrors predeployment `DEFAULT_MODULES` plus OwnableValidator (the latter is
 * installed by the Rhinestone SDK at deploy, not in the provisioning batch).
 */
export const POOL_MODULE_ADDRESSES: readonly Address[] = [
  SMART_SESSIONS_VALIDATOR,
  SMART_SESSIONS_FALLBACK,
  INTENT_EXECUTOR,
  PROXY_EXECUTOR,
  INTENT_SMART_SESSIONS,
  OWNABLE_VALIDATOR,
];
