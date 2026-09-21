#!/usr/bin/env bash
set -euo pipefail

BASE_REF="${GITHUB_BASE_REF:-main}"
DIFF_RANGE="origin/${BASE_REF}...HEAD"

CHANGED="$(git diff --name-only "${DIFF_RANGE}")"

if [ -z "${CHANGED}" ]; then
  echo "No changes detected."
  exit 0
fi

# User-facing paths: published src (not unit/integration tests).
USER_FACING="$(echo "${CHANGED}" | grep -E '^src/' | grep -vE '^src/integration/' | grep -vE '\.test\.ts$' || true)"

if [ -n "${USER_FACING}" ]; then
  echo "User-facing source changed; verifying changeset:"
  echo "${USER_FACING}"
  npx changeset status --since="origin/${BASE_REF}"
else
  echo "No user-facing SDK source changes; skipping changeset requirement."
fi
