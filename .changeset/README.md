# Changesets

We use [Changesets](https://github.com/changesets/changesets) to manage versions and changelogs.

## When to add a changeset

Add a changeset in any PR that changes **user-facing SDK behaviour** (public API, types consumers rely on, bug fixes, deprecations). Skip for docs-only, examples-only, or internal refactors with no release impact.

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

A maintainer runs `npm run version-packages` on `main`, then publishes manually with `npm publish`. See [`docs/RELEASING.md`](../docs/RELEASING.md).
