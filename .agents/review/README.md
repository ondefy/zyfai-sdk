# Automated PR review (Codex)

CI policy for `openai/codex-action`. `AGENTS.md` routes interactive reviews separately.

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

The JSON schema and no-summary output rule apply only to CI; interactive reviews use their own human-readable evidence-report format.

## Repo-local scope

This repository is reviewed **standalone**. Do not clone sibling repositories or `zyfai-workspace` for additional context. Use contracts, docs, types, and tests in this repo.

## CI configuration

The workflow is the source of truth for triggers, model selection, permissions, limits, and ignored paths: [`.github/workflows/codex-pr-review.yml`](../../.github/workflows/codex-pr-review.yml). Public API and canonical contract documentation are reviewed rather than automatically ignored.
