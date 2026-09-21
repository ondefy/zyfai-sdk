# Automated PR review (Codex)

CI policy for `openai/codex-action`. `AGENTS.md` routes interactive reviews to the separate Cursor review workflow.

## Modes

| PR base branch | Mode | Instructions | Codex effort |
| --- | --- | --- | --- |
| `main` | Functional | [functional.md](functional.md) | `medium` |
| `release` | Release | [release.md](release.md) | `high` |

Raise findings when there is credible evidence of incorrect behaviour or meaningful risk. A clean `findings` list is fine, but `review_log` must explain what was checked.

## Files

| File | Role |
| --- | --- |
| [functional.md](functional.md) | Fast, repo-local functional review |
| [release.md](release.md) | Release-readiness review |
| [output-schema.json](output-schema.json) | Structured findings + required `review_log` |
| [publish-findings.sh](publish-findings.sh) | Posts inline comments + PR digest (CI only) |

The JSON schema applies only to CI. Interactive reviews use the human-readable evidence-report format defined by the workspace reviewer.

## Publish gate (tunable)

| Env var | Default | Effect |
| --- | --- | --- |
| `CONFIDENCE_MIN` | `0.65` | Inline comments only for findings at/above this score |
| `PRIORITY_MAX` | `3` | Inline comments for P0–P3 (`priority` ≤ 3) |
| `POST_DIGEST` | `true` | Post/update a PR comment with full output, filtered items, and `review_log` |

CI logs print every finding with **publish** vs **filtered** disposition. Filtered findings still appear in the digest comment.

Severity in output: `priority` 0–3 → P0–P3 (see mode instructions for thresholds).

## GitHub setup (manual)

| Secret | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Codex Responses API |

Workflow: [`.github/workflows/codex-pr-review.yml`](../../.github/workflows/codex-pr-review.yml).
