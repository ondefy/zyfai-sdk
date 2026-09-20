#!/usr/bin/env bash
set -euo pipefail

REVIEW_JSON="${REVIEW_JSON:-codex-output.json}"
CONFIDENCE_MIN="${CONFIDENCE_MIN:-0.85}"
REPOSITORY="${REPOSITORY:?REPOSITORY is required}"
PR_NUMBER="${PR_NUMBER:?PR_NUMBER is required}"
HEAD_SHA="${HEAD_SHA:?HEAD_SHA is required}"
GITHUB_TOKEN="${GITHUB_TOKEN:?GITHUB_TOKEN is required}"

if [ ! -s "$REVIEW_JSON" ]; then
  echo "No Codex output file; skipping."
  exit 0
fi

findings_count="$(jq '.findings | length' "$REVIEW_JSON")"
if [ "$findings_count" -eq 0 ]; then
  echo "No findings; skipping inline comments."
  exit 0
fi

jq -c --arg commit "$HEAD_SHA" --argjson min "$CONFIDENCE_MIN" '
  .findings[]
  | select(.confidence_score >= $min)
  | select(.priority <= 2)
  | {
      body: (
        "**P" + (.priority | tostring) + ":** " + .title + "\n\n" + .body
        + "\n\n_Confidence: " + (.confidence_score | tostring) + "_"
      ),
      commit_id: $commit,
      path: .code_location.absolute_file_path,
      line: .code_location.line_range.end,
      side: "RIGHT",
      start_line: (
        if .code_location.line_range.start != .code_location.line_range.end
        then .code_location.line_range.start
        else null
        end
      ),
      start_side: (
        if .code_location.line_range.start != .code_location.line_range.end
        then "RIGHT"
        else null
        end
      )
    }
  | with_entries(select(.value != null))
' "$REVIEW_JSON" > findings.jsonl

if [ ! -s findings.jsonl ]; then
  echo "No findings above confidence threshold; skipping."
  exit 0
fi

while IFS= read -r payload; do
  echo "Posting inline review comment for: $(echo "$payload" | jq -r '.path')"
  curl -fsS \
    -X POST \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/${REPOSITORY}/pulls/${PR_NUMBER}/comments" \
    -d "$payload"
done < findings.jsonl
