# TSDoc conventions for `@zyfai/sdk`

Public API comments follow the [TSDoc](https://tsdoc.org/) grammar so TypeDoc, IDEs, and published `dist/*.d.ts` stay aligned.

## Where docs live

| Layer | Role |
| --- | --- |
| `src/**/*.ts` TSDoc | Contract: parameters, units, errors, cross-links |
| `npm run docs` | Local TypeDoc → `docs/api/` (gitignored) |
| `README.md` | Tutorials and narrative |
| [docs.zyf.ai](https://docs.zyf.ai) | Product docs (link via `@see`, do not duplicate) |

## Required for exported symbols

1. **Summary** — one imperative sentence.
2. **`@remarks`** — backend (`execution` vs `data`), SIWE/`connectAccount` when needed, EOA vs Safe, amount encoding.
3. **`@param` / `@returns`** — every parameter and return value; use `{@link TypeName}` where helpful.
4. **`@throws`** — intentional `Error` cases (match thrown messages).
5. **`@example`** — one fenced `typescript` block; prefer `connectAccount` → `sendDeposit` → `waitForDepositCredit`.
6. **`@deprecated` + `@see`** — legacy onboarding (`deploySafe`, `createSessionKey`, `depositFunds`).

Use **`@internal`** on integration-only config and private helpers (hidden by TypeDoc `excludeInternal`).

## Global invariants (repeat in package/class `@remarks` where relevant)

- Pass the user's **EOA** as `userAddress`, never the Safe.
- Deposit / withdraw amounts: **least units** (USDC/EURC 6 decimals, WETH 18).
- Earnings and analytics fields: **decimal strings** where documented on the type.
- Public strategies: `conservative` | `aggressive` | `yieldmaxxing` (converted to internal `safe` / `degen` / `async` before API calls).

## Optional tags

- **`@defaultValue`** — real defaults (e.g. `chainId` `8453` on `connectAccount`).
- **`@group`** — TypeDoc sections on `ZyfaiSDK` methods (Authentication, Deposits, Analytics, etc.).

## Linting

After editing source files, run:

```bash
npm run lint:tsdoc
```

`eslint-plugin-tsdoc` reports **`tsdoc/syntax` as warnings** on `src/**/*.ts`. Not part of `npm run check` yet.

## Validation

```bash
npm run check
npm run docs
```

Fix broken `{@link}` targets if TypeDoc warns. Spot-check hovers on `dist/index.d.ts` after `npm run build`.
