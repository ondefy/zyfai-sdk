# Releasing @zyfai/sdk

This package uses [Changesets](https://github.com/changesets/changesets) for versioning and changelogs.

## Contributor flow

When your PR includes user-facing SDK changes:

```bash
npm run changeset
```

- **patch** — bug fixes
- **minor** — new features (non-breaking)
- **major** — breaking changes

Commit the generated file in `.changeset/` with your PR.

See also [`.changeset/README.md`](../.changeset/README.md).

## Publishing (maintainers)

1. Merge accumulated changesets to `main` as usual.
2. Open a **release** PR (`main` → `release`, or your release branch workflow) and complete release review.
3. On merge to `release`, [`.github/workflows/release.yml`](../.github/workflows/release.yml) runs:
   - `npm run version-packages` (bumps `package.json`, updates `CHANGELOG.md`, consumes `.changeset/*.md`)
   - `npm run check`
   - `npm publish`
   - pushes the `chore: release` commit back to `release`

If there are no pending changesets, the workflow exits without publishing.

Merge `release` back into `main` after a successful publish so version and changelog stay aligned on both branches.

### GitHub setup

Create these before the first automated release:

| Item | Purpose |
| --- | --- |
| `NPM_TOKEN` (Actions secret) | npm automation token with publish access to `@zyfai/sdk` (scoped to the `@zyfai` org/package) |
| Workflow permissions | **Settings → Actions → General → Workflow permissions**: allow **Read and write** for `GITHUB_TOKEN` so the release job can push the `chore: release` commit to `release` |

Add `NPM_TOKEN` under **Settings → Secrets and variables → Actions**. Use an [npm granular access token](https://docs.npmjs.com/creating-and-viewing-access-tokens) or classic automation token; do not commit it.

Manual release: **Actions → Release → Run workflow** and select branch **`release`**. The job only runs on `release`; runs started from other branches are skipped.

The release workflow only publishes from `release` (push or manual dispatch on that branch).

### Manual fallback

```bash
git checkout release
git pull
npm ci
npm run version-packages
npm run check
git add package.json CHANGELOG.md
git commit -m "chore: release"
npm publish
git push origin release
```

Requirements for local publish:

- npm account with publish access to `@zyfai/sdk`
- Be logged in locally (`npm login`) or have a valid auth token in `~/.npmrc`

## Local verification

```bash
npm run changeset
npm run version-packages   # on a test branch only
npm publish --dry-run
npm run check
```
