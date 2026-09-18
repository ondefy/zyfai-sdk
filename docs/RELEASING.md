# Releasing @zyfai/sdk

This package uses [Changesets](https://github.com/changesets/changesets) for versioning and changelogs. **npm publish is manual** — there is no CI release workflow.

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

After merged changesets are on `main`:

```bash
git checkout main
git pull
npm ci
npm run version-packages   # bumps package.json, updates CHANGELOG.md, consumes .changeset/*.md
npm run check
git add package.json CHANGELOG.md
git commit -m "chore: release"
npm publish
git push origin main
```

Requirements:

- npm account with publish access to `@zyfai/sdk`
- Be logged in locally (`npm login`) or have a valid auth token in `~/.npmrc`

## Local verification

```bash
npm run changeset
npm run version-packages   # on a test branch only
npm publish --dry-run
npm run check
```
