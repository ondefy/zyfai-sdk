# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TypeScript SDK (`@zyfai/sdk`) for Zyfai Yield Optimization Engine. Enables deployment of Safe smart wallets with ERC-4337 account abstraction, session key management, and DeFi yield optimization across multiple protocols and chains.

## Commands

```bash
npm run build          # Build SDK (tsup -> dist/ with CJS + ESM + .d.ts)
npm run dev            # Watch mode
npm run lint           # ESLint (note: no .eslintrc config file exists yet)
npm test               # Jest (note: no test files or jest.config exist yet)
npm run docs           # Generate TypeDoc API docs

# Documentation site (website/ uses pnpm, not npm)
npm run docs:dev       # Start Docusaurus dev server
npm run docs:build     # Build documentation site

# Run examples (requires .env with ZYFAI_API_KEY and PRIVATE_KEY)
npx tsx examples/end-to-end.ts
```

## Architecture

### Core Design Pattern

The SDK uses **explicit parameter-based design**:
- All methods require explicit `userAddress` and `chainId` parameters
- Connected wallet/private key is used **only for signing transactions**
- One SDK instance can manage multiple users

```typescript
const sdk = new ZyfaiSDK({ apiKey: "..." });

// Step 1: Connect account (two overloads)
await sdk.connectAccount("0xPrivateKey", 42161);  // Private key + chainId (required)
await sdk.connectAccount(walletProvider);           // Browser provider (chainId auto-detected)

// Step 2: Methods take explicit user addresses - never infer from wallet state
await sdk.deploySafe(userAddress, chainId);
await sdk.getPositions(userAddress);
```

### Multi-Backend Architecture

The SDK communicates with **two separate API backends** (see `src/config/endpoints.ts` and `src/utils/http-client.ts`):

1. **Execution API (v1)** at `https://api.zyf.ai/api/v1` -- Safe deployment, transactions, session keys, SIWE auth, positions, history. Requires JWT for authenticated endpoints.

2. **Data API (v2)** at `https://defiapi.zyf.ai/api/v2` -- Analytics, earnings, opportunities, APY, Debank portfolio, rebalance info.

Both use the same API key (`X-API-Key` header). The HttpClient class manages two separate axios instances with interceptors for auth token injection.

### Key Files

| File | Lines | Role |
|------|-------|------|
| `src/core/ZyfaiSDK.ts` | ~2800 | Main SDK class with 30+ public methods (needs refactoring, target <800 lines) |
| `src/utils/http-client.ts` | ~260 | Dual axios client for Execution + Data APIs |
| `src/utils/safe-account.ts` | ~330 | Safe wallet deployment, deterministic addresses, session key signing |
| `src/utils/strategy.ts` | ~100 | Strategy name conversion between public/internal APIs |
| `src/config/endpoints.ts` | ~116 | All API endpoint path definitions |
| `src/config/chains.ts` | ~120 | Chain configs, custom Plasma chain definition |
| `src/config/abis.ts` | ~90 | Smart contract ABIs (ERC20, Identity Registry) |
| `src/types/index.ts` | ~660 | All TypeScript interfaces and types |

### Supported Chains

| Chain | ID | Default Token |
|-------|-----|--------------|
| Base (default) | 8453 | USDC (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`) |
| Arbitrum | 42161 | USDC (`0xaf88d065e77c8cc2239327c5edb3a432268e5831`) |
| Plasma | 9745 | USDT (`0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb`) |

Plasma is a custom chain definition (not in viem/chains). See `src/config/chains.ts`.

### Key Dependencies

- **viem** (v2.0+): Ethereum interactions -- **peer dependency** (must be installed by consumer)
- **permissionless** (v0.2.38+): ERC-4337 account abstraction, Safe deployment via ERC-7579 launchpad
- **@rhinestone/module-sdk** (v0.2.10+): Session key management for Safe smart accounts
- **siwe** (v3.0.0): Sign-In with Ethereum authentication
- **axios**: HTTP client for both API backends

## Critical Conventions

### Strategy Naming (IMPORTANT)

Public SDK uses `"conservative"` / `"aggressive"`. Internal API uses `"safe_strategy"` / `"degen_strategy"`.

**Always convert at the boundary:**
- Use `toInternalStrategy()` and `toPublicStrategy()` from `src/utils/strategy.ts`
- Never pass public strategy names directly to API calls

### Import Rules

- **ALL imports MUST be at the top of the file** -- no dynamic imports, no inline imports between functions
- Order: external packages, internal utils, config/constants, types (using `import type`)

### Documentation Requirements

**When making ANY code changes, update BOTH:**
1. **README.md** -- User-facing documentation with examples
2. **SDK_DOCUMENTATION_SUMMARY.md** -- Reference documentation

Never create additional documentation files (no ARCHITECTURE.md, CHANGELOG.md, etc.).

### Style

- **NEVER use emojis** anywhere in code, logs, comments, or error messages
- Use double quotes for strings
- Functional patterns preferred over classes (except main SDK class)
- Descriptive variable names with auxiliary verbs (`isLoading`, `hasError`)
- JSDoc comments for all public methods
- Response types: `{ success: boolean, ... }` pattern
- Guard clauses and early returns for error conditions

### Naming

- Files: `lowercase-with-dashes.ts`
- Functions: `camelCase`
- Types/Interfaces: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`

### Modularity

- ABIs in `src/config/abis.ts`, constants in `src/config/constants.ts`
- Utilities in `src/utils/`, types in `src/types/`
- Main SDK class target: <800 lines. Utility files: <500 lines
- Extract reusable logic to utility functions

### Git

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- First line under 72 characters

## Key Flows

### Authentication: `connectAccount()` triggers SIWE auth automatically. JWT stored in HttpClient. Browser uses `window.location.origin` for SIWE domain; Node.js uses API endpoint URL. `disconnectAccount()` clears all auth state.

### Safe Deployment: `deploySafe(userAddress, chainId, strategy)` calculates deterministic Safe address via CREATE2, checks if already deployed (early return), then sends deployment request to backend. Uses `permissionless` with Safe v1.4.1 and entry point 0.7.

### Session Keys: `createSessionKey(userAddress, chainId)` checks for existing active key (early return), fetches config from API, signs using `@rhinestone/module-sdk`, activates via API. Tracks state to avoid duplicates.

### Deposits: Frontend sends ERC20 transfer to Safe address, then SDK calls `/users/log_deposit`. Token auto-selected by chain.

### Withdrawals: SDK calls `/users/withdraw` or `/users/partial-withdraw`. Backend processes asynchronously -- tx hash may not be immediately available. Track via `getHistory()`.
