#!/usr/bin/env bash
# Regression: a GitHub 422 on one inline anchor must not fail the publish job.
set -euo pipefail

root="$(cd "$(dirname "$0")" && pwd)"
script="${root}/publish-findings.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

mkdir -p "$tmp/bin"

cat >"$tmp/bin/curl" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
out=""
data=""
while [ $# -gt 0 ]; do
  case "$1" in
    -o) out="$2"; shift 2 ;;
    -w) shift 2 ;;
    -d) data="$2"; shift 2 ;;
    -X|-H) shift 2 ;;
    *) shift ;;
  esac
done
path="$(printf '%s' "$data" | jq -r '.path')"
mode="${CURL_MODE:-mixed}"
if [ "$mode" = "500" ] || { [ "$mode" = "mixed" ] && [ "$path" = "src/index.ts" ]; }; then
  if [ "$mode" = "500" ]; then
    code="500"
    printf '%s' '{"message":"Server Error"}' >"$out"
  else
    code="422"
    printf '%s' '{"message":"Validation Failed","errors":[{"message":"line must be part of the diff"}]}' >"$out"
  fi
  printf '%s' "$code"
  exit 0
fi
printf '%s' '{"id":1}' >"$out"
printf '201'
EOF

cat >"$tmp/bin/gh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
if [ "${1:-}" = "api" ]; then
  printf '[]\n'
  exit 0
fi
if [ "${1:-}" = "pr" ] && [ "${2:-}" = "comment" ]; then
  : >"${GH_COMMENT_MARKER:?}"
  exit 0
fi
echo "unexpected gh invocation: $*" >&2
exit 1
EOF

chmod +x "$tmp/bin/curl" "$tmp/bin/gh"

cat >"$tmp/review.json" <<'EOF'
{
  "findings": [
    {
      "title": "Anchored finding",
      "body": "This line is in the diff.",
      "confidence_score": 0.91,
      "priority": 2,
      "code_location": {
        "absolute_file_path": "/home/runner/work/zyfai-sdk/zyfai-sdk/src/core/ZyfaiSDK.ts",
        "line_range": { "start": 924, "end": 924 }
      }
    },
    {
      "title": "Unanchored finding",
      "body": "This line is outside the diff.",
      "confidence_score": 0.86,
      "priority": 1,
      "code_location": {
        "absolute_file_path": "/home/runner/work/zyfai-sdk/zyfai-sdk/src/index.ts",
        "line_range": { "start": 75, "end": 75 }
      }
    }
  ],
  "review_log": "regression"
}
EOF

export PATH="$tmp/bin:$PATH"
export REVIEW_JSON="$tmp/review.json"
export REPOSITORY="ondefy/zyfai-sdk"
export PR_NUMBER="60"
export HEAD_SHA="abc123"
export GITHUB_TOKEN="test-token"
export POST_DIGEST="true"
export GH_COMMENT_MARKER="$tmp/digest-posted"
export CURL_MODE="mixed"

log="$(mktemp)"
# The publisher writes findings.jsonl in the working directory.
( cd "$tmp" && bash "$script" >"$log" 2>&1 )

grep -q "Skipping inline comment for src/index.ts:75" "$log"
grep -q "line must be part of the diff" "$log"
grep -q "Posting inline review comment for: src/core/ZyfaiSDK.ts:924" "$log"
test -f "$GH_COMMENT_MARKER"

rm -f "$GH_COMMENT_MARKER"
export CURL_MODE="500"
set +e
( cd "$tmp" && bash "$script" >"$log" 2>&1 )
status=$?
set -e
test "$status" -ne 0
grep -q "HTTP 500" "$log"
test ! -f "$GH_COMMENT_MARKER"

echo "publish-findings regression ok"
