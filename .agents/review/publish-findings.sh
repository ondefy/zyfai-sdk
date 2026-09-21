#!/usr/bin/env bash
set -euo pipefail

REVIEW_JSON="${REVIEW_JSON:-codex-output.json}"
CONFIDENCE_MIN="${CONFIDENCE_MIN:-0.65}"
PRIORITY_MAX="${PRIORITY_MAX:-3}"
POST_DIGEST="${POST_DIGEST:-true}"
REPOSITORY="${REPOSITORY:?REPOSITORY is required}"
PR_NUMBER="${PR_NUMBER:?PR_NUMBER is required}"
HEAD_SHA="${HEAD_SHA:?HEAD_SHA is required}"
GITHUB_TOKEN="${GITHUB_TOKEN:?GITHUB_TOKEN is required}"
DIGEST_MARKER="<!-- codex-review-digest -->"

log() {
  echo "[codex-publish] $*"
}

export GH_TOKEN="${GITHUB_TOKEN}"

if [ ! -s "$REVIEW_JSON" ]; then
  log "No Codex output file; skipping."
  exit 0
fi

log "Raw Codex output:"
jq '.' "$REVIEW_JSON" | sed 's/^/[codex-publish]   /'

findings_count="$(jq '.findings | length' "$REVIEW_JSON")"
review_log="$(jq -r '.review_log // "(missing review_log)"' "$REVIEW_JSON")"
log "Findings returned by Codex: ${findings_count}"
log "Review log:"
printf '%s\n' "$review_log" | sed 's/^/[codex-publish]   /'

if [ "$findings_count" -gt 0 ]; then
  log "Finding disposition (confidence_min=${CONFIDENCE_MIN}, priority_max=P${PRIORITY_MAX}):"
  jq -c --argjson min "$CONFIDENCE_MIN" --argjson pmax "$PRIORITY_MAX" '
    .findings[]
    | . as $f
    | (
        if $f.confidence_score < $min then "filtered: confidence " + ($f.confidence_score | tostring) + " < " + ($min | tostring)
        elif $f.priority > $pmax then "filtered: priority P" + ($f.priority | tostring) + " > P" + ($pmax | tostring)
        else "publish"
        end
      ) as $action
    | {
        action: $action,
        priority: $f.priority,
        confidence: $f.confidence_score,
        title: $f.title,
        path: (
          $f.code_location.absolute_file_path
          | gsub("^/.*/work/[^/]+/[^/]+/"; "")
        ),
        lines: "\($f.code_location.line_range.start)-\($f.code_location.line_range.end)"
      }
  ' "$REVIEW_JSON" | while IFS= read -r row; do
    log "  $(echo "$row" | jq -r '[.action, "P" + (.priority|tostring), .confidence, .path + ":" + .lines, .title] | @tsv')"
  done
fi

jq -c --arg commit "$HEAD_SHA" --argjson min "$CONFIDENCE_MIN" --argjson pmax "$PRIORITY_MAX" '
  .findings[]
  | select(.confidence_score >= $min)
  | select(.priority <= $pmax)
  | {
      body: (
        "**P" + (.priority | tostring) + ":** " + .title + "\n\n" + .body
        + "\n\n_Confidence: " + (.confidence_score | tostring) + "_"
      ),
      commit_id: $commit,
      path: (
        .code_location.absolute_file_path
        | gsub("^/.*/work/[^/]+/[^/]+/"; "")
      ),
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

publishable_count=0
if [ -s findings.jsonl ]; then
  publishable_count="$(wc -l < findings.jsonl | tr -d ' ')"
fi
filtered_count=$((findings_count - publishable_count))

log "Publishable inline comments: ${publishable_count}"
log "Filtered by gate: ${filtered_count}"

if [ -s findings.jsonl ]; then
  while IFS= read -r payload; do
    path="$(echo "$payload" | jq -r '.path')"
    log "Posting inline review comment for: ${path}"
    curl -fsS \
      -X POST \
      -H "Accept: application/vnd.github+json" \
      -H "Authorization: Bearer ${GITHUB_TOKEN}" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      "https://api.github.com/repos/${REPOSITORY}/pulls/${PR_NUMBER}/comments" \
      -d "$payload"
  done < findings.jsonl
else
  log "No inline comments to post."
fi

if [ "$POST_DIGEST" != "true" ]; then
  log "POST_DIGEST=false; skipping digest comment."
  exit 0
fi

digest_file="$(mktemp)"
jq -r --arg marker "$DIGEST_MARKER" --argjson min "$CONFIDENCE_MIN" --argjson pmax "$PRIORITY_MAX" --arg head "$HEAD_SHA" '
  def finding_line:
    "- **P" + (.priority | tostring) + "** (confidence " + (.confidence_score | tostring) + ")"
    + " `" + (
      .code_location.absolute_file_path
      | gsub("^/.*/work/[^/]+/[^/]+/"; "")
    ) + "` — " + .title;

  $marker + "\n\n"
  + "## Codex review digest\n\n"
  + "**Commit:** `" + $head + "`\n"
  + "**Publish gate:** confidence ≥ " + ($min | tostring) + ", priority ≤ P" + ($pmax | tostring) + "\n\n"
  + "### Review log\n\n"
  + (.review_log // "_No review_log provided._") + "\n\n"
  + "### Findings summary\n\n"
  + (
    if (.findings | length) == 0
    then "_Codex returned no findings._\n"
    else
      "**Returned:** " + ((.findings | length) | tostring) + "\n"
      + "**Published inline:** " + (
        [.findings[] | select(.confidence_score >= $min and .priority <= $pmax)] | length | tostring
      ) + "\n"
      + "**Filtered by gate:** " + (
        [.findings[] | select(.confidence_score < $min or .priority > $pmax)] | length | tostring
      ) + "\n\n"
      + (
        if ([.findings[] | select(.confidence_score >= $min and .priority <= $pmax)] | length) > 0
        then "#### Published\n\n"
          + ([.findings[] | select(.confidence_score >= $min and .priority <= $pmax)] | map(finding_line) | join("\n"))
          + "\n\n"
        else "" end
      )
      + (
        if ([.findings[] | select(.confidence_score < $min or .priority > $pmax)] | length) > 0
        then "#### Filtered (below gate)\n\n"
          + (
            [.findings[] | select(.confidence_score < $min or .priority > $pmax)]
            | map(
                finding_line
                + (
                  if .confidence_score < $min
                  then " _(filtered: confidence < " + ($min | tostring) + ")_"
                  else " _(filtered: priority > P" + ($pmax | tostring) + ")_"
                  end
                )
              )
            | join("\n")
          )
          + "\n"
        else "" end
      )
    end
  )
' "$REVIEW_JSON" > "$digest_file"

DIGEST_BOT_LOGIN="${DIGEST_BOT_LOGIN:-github-actions[bot]}"
comment_payload="$(jq -n --rawfile body "$digest_file" '{body: $body}')"
existing_comment_id="$(
  gh api "repos/${REPOSITORY}/issues/${PR_NUMBER}/comments" --paginate \
    | jq --arg marker "$DIGEST_MARKER" --arg bot "$DIGEST_BOT_LOGIN" '
      [.[] | select(.body | contains($marker)) | select(.user.login == $bot)]
      | last
      | .id // empty
    '
)"

if [ -n "$existing_comment_id" ]; then
  log "Updating digest comment ${existing_comment_id}"
  gh api \
    --method PATCH \
    "repos/${REPOSITORY}/issues/comments/${existing_comment_id}" \
    --input - <<<"$comment_payload" >/dev/null
else
  log "Creating digest comment on PR #${PR_NUMBER}"
  gh pr comment "$PR_NUMBER" \
    --repo "$REPOSITORY" \
    --body-file "$digest_file"
fi

log "Done."
