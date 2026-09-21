# zyfai-sdk

Public TypeScript client (`@zyfai/sdk`). Thin facade over two backends — does not execute rebalances.
Parent map: `../AGENTS.md`. Public docs: [docs.zyf.ai](https://docs.zyf.ai).

## Backends

| Backend | Base URL | Role |
| --- | --- | --- |
| Execution | `https://api.zyf.ai/api/v1` | Deposits, withdraws, session keys, positions |
| Data | `https://defiapi.zyf.ai/api/v2` | APY, opportunities, earnings, analytics |

Endpoint map: `src/config/endpoints.ts`. Strategy conversion: `src/utils/strategy.ts`
(`conservative`/`aggressive` ↔ `safe`/`degen`).

## Commands

```bash
npm install
npm run check              # typecheck + unit tests + build — canonical validation
npm run test:unit          # vitest on src/utils/
npm run test:integration   # opt-in vitest on src/integration/ (needs .env.test + local api)
npm run build
npm run dev                # watch build
npm run docs               # typedoc → docs/api/ (gitignored)
```

Filter one integration test: `npm run test:integration -- <feature-id>` or `-t "test name"`.
Watch mode: `npx vitest <feature-id>`.

## Repository map

| Path | Role |
| --- | --- |
| `src/core/ZyfaiSDK.ts` | Main SDK class |
| `src/config/` | Chains, endpoints, constants, ABIs |
| `src/utils/` | HTTP client, fees, safe account helpers, strategy |
| `src/integration/` | Opt-in Vitest tests against local `zyfai-api` (see README) |
| `examples/` | Runnable integration examples |

## Onboarding flow (current product)

1. User connects EOA (`connectAccount` → SIWE).
2. First `depositFunds` assigns a **pre-deployed Safe + session** from the wallet pool — do not
   document `deploySafe` / `createSessionKey` as required user steps.
3. Pass the **EOA** as `userAddress`, never the Safe address.

Legacy methods `deploySafe` and `createSessionKey` remain for backward compatibility but are
deprecated for new integrations.

## Design rules

- Explicit `userAddress` + `chainId` on every method; wallet is for signing only.
- All imports at file top — no dynamic `import()`.
- Amounts for deposits: least units (USDC 6 decimals). Earnings: decimal strings.
- No emojis in code, logs, or errors.
- After public API surface changes: update `README.md` and `ondefy/sdk-api-docs` (not a submodule here).

## Context routing

| Task | Start here |
| --- | --- |
| User-facing API examples | [`README.md`](README.md) |
| Doc index | [`docs/README.md`](docs/README.md) |
| Release / changesets | [`docs/RELEASING.md`](docs/RELEASING.md) |
| Bankr integration | [`docs/BANKR_INTEGRATION.md`](docs/BANKR_INTEGRATION.md) |
| Review / public contract | [`docs/review-invariants.md`](docs/review-invariants.md) |
| Past lessons | [`docs/engineering-history.md`](docs/engineering-history.md) |
| Runnable examples | [`examples/`](examples/) |
| Integration testing | [`README.md` § Integration testing](README.md#integration-testing) |
| Cross-repo feature verification | [`../.cursor/skills/functional-feature-verification/SKILL.md`](../.cursor/skills/functional-feature-verification/SKILL.md) |

## Code review

**Only raise an issue when there is a concrete reason to believe the PR introduces incorrect behaviour or meaningful risk.** Silence is success.

| Automated PR base branch | Mode | CI policy |
| --- | --- | --- |
| `main` | Functional | [`.agents/review/functional.md`](.agents/review/functional.md) |
| `release` | Release | [`.agents/review/release.md`](.agents/review/release.md) |

These `.agents/review/` policies are for automated CI and its JSON result only. For interactive reviews, follow the parent workspace's `review-change` → `functional-reviewer` route and retain its human-readable evidence report. Release reviews start with [`docs/review-invariants.md`](docs/review-invariants.md) and stay repo-local; do not clone sibling repositories.

## Task completion

1. Read README + relevant example for the method you change.
2. Update types and unit tests in `src/utils/*.test.ts` when behaviour changes.
3. For new execution API behaviour: add `src/integration/<feature-id>.integration.test.ts`
   (mirror `examples/`); run `npm run test:integration` against local `zyfai-api`.
   Cross-repo flows: follow
   [`functional-feature-verification`](../.cursor/skills/functional-feature-verification/SKILL.md).
4. PRs with user-facing changes need a changeset (`npm run changeset`); see [`docs/RELEASING.md`](docs/RELEASING.md).
5. Run `npm run check` before finishing.
6. Durable lessons → `.cursor/learnings/` or `docs/engineering-history.md`.
