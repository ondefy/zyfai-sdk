# Automated PR review (Codex)

Review behaviour for CI (`openai/codex-action`) and interactive agents. `AGENTS.md` routes here.

## Modes

| PR base branch | Mode | Instructions |
| --- | --- | --- |
| `main` | Functional | [functional.md](functional.md) |
| `release` | Release | [release.md](release.md) |

**Only raise an issue when there is a concrete reason to believe the PR introduces incorrect behaviour or meaningful risk.** A clean review with no comments is a successful outcome.

## Files

| File | Role |
| --- | --- |
| [functional.md](functional.md) | Fast, repo-local functional review |
| [release.md](release.md) | Release-readiness review |
| [output-schema.json](output-schema.json) | Structured findings for inline PR comments |
| [publish-findings.sh](publish-findings.sh) | Posts inline comments (CI only) |

## Repo-local scope

This repository is reviewed **standalone**. Do not clone sibling repositories or `zyfai-workspace` for additional context. Use contracts, docs, types, and tests in this repo.

## CI triggers

**`paths-ignore` (PR only):** `README.md`, `docs/**`, `examples/**`, extra markdown docs, lockfiles, `typedoc.json`, `.cursorrules`.

**`workflow_dispatch`:** provide `pr_number` to re-run manually (bypasses `paths-ignore`).
