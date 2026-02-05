# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TypeScript SDK for Zyfai Yield Optimization Engine. Enables deployment of Safe smart wallets with ERC-4337 account abstraction, session key management, and DeFi yield optimization across multiple protocols and chains.

## Commands

### Development
```bash
# Build the SDK (creates dist/ with CJS + ESM)
npm run build

# Watch mode for development
npm run dev

# Run linter
npm run lint

# Run tests
npm test

# Generate documentation
npm run docs
npm run docs:watch     # Watch mode
npm run docs:json      # Generate JSON API docs
```

### Documentation Site (website/)
```bash
npm run docs:dev       # Start dev server
npm run docs:build     # Build documentation site
npm run docs:serve     # Serve built docs
```

### Testing with Examples
```bash
# Run any example file (requires .env with ZYFAI_API_KEY and PRIVATE_KEY)
npx tsx examples/end-to-end.ts
npx tsx examples/basic-usage.ts
```

## Architecture

### Core Design Pattern

The SDK uses an **explicit parameter-based design**:
- All methods require explicit `userAddress` and `chainId` parameters
- Connected wallet/private key is used **only for signing transactions**
- One SDK instance can manage multiple users
- Separates concerns: SDK initialization → wallet connection → method calls with explicit parameters

**Example:**
```typescript
// Wallet is for signing only
await sdk.connectAccount("0xPrivateKey", 42161);

// Methods take explicit user addresses
await sdk.deploySafe(userAddress, chainId);
await sdk.getPositions(userAddress);
```

### Multi-Backend Architecture

The SDK communicates with **two separate API backends**:

1. **Execution API (v1)** at `https://api.zyf.ai/api/v1`
   - Safe deployment, transactions, session keys
   - User authentication (SIWE)
   - Protocol data, positions, history
   - Requires JWT token for authenticated endpoints

2. **Data API (v2)** at `https://defiapi.zyf.ai/api/v2`
   - Analytics and earnings calculations
   - Opportunities and APY data
   - Debank portfolio integration
   - Rebalance information

Both APIs use the same API key. Execution API requires SIWE authentication for user-specific operations.

### Directory Structure

```
src/
├── core/
│   └── ZyfaiSDK.ts           # Main SDK class (2173 lines)
├── utils/
│   ├── safe-account.ts       # Safe wallet deployment, session key signing
│   ├── http-client.ts        # Dual HTTP client (Execution + Data API)
│   └── strategy.ts           # Strategy conversion (conservative/aggressive ↔️ safe/degen)
├── config/
│   ├── chains.ts             # Chain configs (Arbitrum, Base, Plasma)
│   ├── endpoints.ts          # API endpoint definitions for both backends
│   └── abis.ts               # Smart contract ABIs (ERC20)
├── types/
│   └── index.ts              # All TypeScript types and interfaces
└── index.ts                  # Public API exports
```

### Key Technologies

- **viem** (v2.0+): Ethereum interactions, wallet clients, public clients
- **permissionless** (v0.2.38+): ERC-4337 account abstraction (Safe deployment)
- **@rhinestone/module-sdk** (v0.2.10+): Session key management for Safe
- **siwe**: Sign-In with Ethereum authentication
- **axios**: HTTP client for both API backends

### Supported Chains

| Chain | ID | Default Token |
|-------|-----|--------------|
| Base | 8453 | USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913) |
| Arbitrum | 42161 | USDC (0xaf88d065e77c8cc2239327c5edb3a432268e5831) |
| Plasma | 9745 | USDT (0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb) |

Default chain: Base (8453)

## Code Organization Principles

### Import Rules (CRITICAL)

- **ALL imports MUST be at the top of the file** - no exceptions
- **NEVER use dynamic imports** (`await import()`) inside functions
- **NEVER define inline imports** between functions
- Import order:
  1. External dependencies (npm packages)
  2. Internal utilities and helpers
  3. Configuration and constants
  4. Types (using `import type`)

### Modularity Requirements

- ABIs go in `src/config/abis.ts`
- Constants go in `src/config/constants.ts`
- Utilities go in `src/utils/`
- Types go in `src/types/`
- Main SDK class should stay under 800 lines (currently 2173 - needs refactoring)
- Extract reusable logic to utility functions
- Use single responsibility principle

### Naming Conventions

- Files: `lowercase-with-dashes.ts`
- Functions: `camelCase`
- Types/Interfaces: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`

### Strategy Naming

Public SDK uses "conservative" and "aggressive". Internal API uses "safe" and "degen".

**Always convert strategies at the boundary:**
- SDK methods accept: `"conservative" | "aggressive"`
- API expects: `"safe" | "degen"`
- Use `toInternalStrategy()` and `convertStrategyToPublic()` from `src/utils/strategy.ts`

## Common Operations

### Safe Wallet Deployment Flow

1. User calls `sdk.connectAccount()` → SIWE authentication happens automatically
2. SDK stores JWT token for authenticated endpoints
3. `deploySafe(userAddress, chainId, strategy)`:
   - Calculates deterministic Safe address using CREATE2
   - Checks if already deployed (early return if yes)
   - Sends deployment request to backend API
   - Backend handles all RPC calls and bundler interactions
4. After deployment, Safe address is predictable and deterministic

### Session Key Flow

1. User must call `connectAccount()` first (for SIWE auth)
2. `createSessionKey(userAddress, chainId)`:
   - Checks if user already has active session key (returns early if yes)
   - Fetches optimal session configuration from API
   - Signs session key using `@rhinestone/module-sdk`
   - Calls API to activate session key immediately
   - Tracks session state to avoid duplicate creation

### Deposit/Withdraw Flow

**Deposit:**
- Frontend user sends ERC20 transfer to Safe address
- SDK calls `/users/log_deposit` to register the deposit
- Token addresses are auto-selected based on chain (USDC for Base/Arbitrum, USDT for Plasma)

**Withdraw:**
- SDK calls `/users/withdraw` or `/users/partial-withdraw`
- Backend processes withdrawal asynchronously
- Transaction hash may not be immediately available
- Use `getHistory()` to track withdrawal status

## Important Implementation Details

### Authentication

- `connectAccount()` automatically performs SIWE authentication
- JWT token is stored in HttpClient and used for authenticated endpoints
- Browser: Uses `window.location.origin` for SIWE domain
- Node.js: Uses API endpoint URL for SIWE domain
- `disconnectAccount()` clears wallet, auth state, and JWT token

### RPC Configuration

SDK uses default public RPCs. Users can override by passing `rpcUrls` in constructor:
```typescript
new ZyfaiSDK({
  apiKey: "...",
  rpcUrls: {
    8453: "https://base-mainnet.g.alchemy.com/v2/YOUR_KEY",
    42161: "https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY",
  }
});
```

### Error Handling Patterns

- Use early returns for error conditions
- Implement guard clauses at function start
- Validate inputs before executing logic
- Never swallow errors silently
- Return `{ success: boolean, ... }` response types

## Testing & Examples

20+ example files in `examples/` directory demonstrate all SDK features:
- Core: `end-to-end.ts`, `basic-usage.ts`, `deploy-safe.ts`
- Session Keys: `create-session-key.ts`
- Funds: `deposit.ts`, `withdraw.ts`, `deposit-withdraw.ts`
- Data: `get-positions.ts`, `get-protocols.ts`, `get-history.ts`
- Analytics: `get-onchain-earnings.ts`, `get-daily-earnings.ts`, `get-apy-history.ts`
- Opportunities: `get-opportunities.ts`, `get-apy-per-strategy.ts`

## Documentation Requirements

**CRITICAL:** When making ANY code changes, you MUST update BOTH:
1. **README.md** - User-facing documentation with examples
2. **SDK_DOCUMENTATION_SUMMARY.md** - Reference documentation

Never create additional documentation files (no ARCHITECTURE.md, CHANGELOG.md, etc.).

## Style Guidelines

- **NEVER use emojis** anywhere in code, logs, comments, or error messages
- Use double quotes for strings
- Functional programming patterns preferred over classes (except main SDK class)
- Descriptive variable names with auxiliary verbs (`isLoading`, `hasError`)
- JSDoc comments for all public methods

## Git Conventions

- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- Keep first line under 72 characters
- Provide context in commit body when needed

## Security

- Never log or expose private keys
- Validate all user inputs
- Use type guards for external data
- Sanitize error messages (don't expose internal details)
- Never commit `.env` files or API keys
