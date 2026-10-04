# Changesets

We use [Changesets](https://github.com/changesets/changesets) to manage versions and changelogs.

## When to add a changeset

Add a changeset on the **feature branch** when work begins on **user-facing SDK behaviour** (public API, types consumers rely on, bug fixes, deprecations). Commit `.changeset/*.md` with the first implementation change, not only at PR review. Skip for docs-only, examples-only, or internal refactors with no release impact.

Agents (Cursor harness): if you touch `src/` API surface in `zyfai-sdk`, create or update a changeset in the same branch before finishing the task.

## How

```bash
npm run changeset
```

1. Select `@zyfai/sdk`
2. Choose bump type:
   - **patch** — bug fixes, internal fixes with user-visible effect
   - **minor** — new methods/options, backwards compatible
   - **major** — breaking API changes
3. Write a short summary (becomes the changelog entry)
4. Commit the generated `.changeset/*.md` file with your PR

## After merge

Merge a release PR into `release`; GitHub Actions versions, runs `npm run check`, and publishes to npm (see [`.github/workflows/release.yml`](../.github/workflows/release.yml)). Full maintainer flow: [`docs/RELEASING.md`](../docs/RELEASING.md).
