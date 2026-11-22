#!/usr/bin/env bash
# Generic PostToolUse / Stop quality gate hook for dislop with a 2-strike circuit breaker.
# Usage:
#   integrations/hooks/dislop-gate.sh [file1 file2 ...]
# When no files are passed, checks git-changed supported files against HEAD.

set -euo pipefail

STRIKE_DIR="${TMPDIR:-/tmp}/dislop-hook-strikes"
MAX_STRIKES="${DISLOP_HOOK_MAX_STRIKES:-2}"
BLOCK_EXIT="${DISLOP_HOOK_BLOCK_EXIT:-1}"
mkdir -p "$STRIKE_DIR"

resolve_dislop() {
  if command -v dislop >/dev/null 2>&1; then
    echo "dislop"
  elif [ -f "./bin/dislop.mjs" ] && command -v node >/dev/null 2>&1; then
    echo "node ./bin/dislop.mjs"
  else
    echo "npx --yes dislop"
  fi
}

is_supported_file() {
  case "$1" in
    *.md|*.mdx|*.txt|*.html|*.htm|*.css|*.jsx|*.tsx|*.svg|*.docx|*.pptx) return 0 ;;
    *) return 1 ;;
  esac
}

hash_key() {
  if command -v shasum >/dev/null 2>&1; then
    printf "%s" "$1" | shasum -a 256 | awk '{print $1}'
  elif command -v sha256sum >/dev/null 2>&1; then
    printf "%s" "$1" | sha256sum | awk '{print $1}'
  else
    printf "%s" "$1" | cksum | awk '{print $1}'
  fi
}

TARGETS=()
if [ "$#" -gt 0 ]; then
  for f in "$@"; do
    if [ -f "$f" ] && is_supported_file "$f"; then
      TARGETS+=("$f")
    fi
  done
elif command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  while IFS= read -r f; do
    [ -n "$f" ] && [ -f "$f" ] && is_supported_file "$f" && TARGETS+=("$f")
  done < <(git diff --name-only HEAD 2>/dev/null || true)
fi

if [ "${#TARGETS[@]}" -eq 0 ]; then
  exit 0
fi

RUNNER="$(resolve_dislop)"
BLOCKED=0

for file in "${TARGETS[@]}"; do
  KEY="$(hash_key "$(pwd):$file")"
  STRIKE_FILE="$STRIKE_DIR/$KEY"
  STRIKES=0
  if [ -f "$STRIKE_FILE" ]; then
    STRIKES="$(cat "$STRIKE_FILE" 2>/dev/null || echo 0)"
  fi

  set +e
  OUT="$($RUNNER check "$file" --fail-on error 2>&1)"
  CODE=$?
  set -e

  if [ "$CODE" -eq 0 ]; then
    rm -f "$STRIKE_FILE"
    WARN_LINES="$(printf "%s\n" "$OUT" | grep -E '^\[WARNING\]' | head -n 3 || true)"
    if [ -n "$WARN_LINES" ]; then
      printf "dislop reminders (%s):\n%s\n" "$file" "$WARN_LINES"
    fi
    continue
  fi

  NEXT_STRIKES=$((STRIKES + 1))
  printf "%s" "$NEXT_STRIKES" > "$STRIKE_FILE"

  if [ "$NEXT_STRIKES" -gt "$MAX_STRIKES" ]; then
    printf "dislop circuit breaker (%s): reached %d consecutive blocks; handing off to human review.\n" "$file" "$MAX_STRIKES" >&2
    rm -f "$STRIKE_FILE"
    continue
  fi

  printf "%s\n" "$OUT" >&2
  BLOCKED=1
done

if [ "$BLOCKED" -ne 0 ]; then
  exit "$BLOCK_EXIT"
fi
exit 0
