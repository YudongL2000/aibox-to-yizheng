#!/usr/bin/env bash
# [Input] Consume upstream contracts defined by `scripts/.folder.md`[Pos].
# [Output] Provide docs check capability to downstream modules.
# [Pos] script node in scripts
# [Sync] If this file changes, update this header and `scripts/.folder.md`.

set -euo pipefail

WORKSPACE="${1:-.}"
EXIT_CODE=0
SPIKE_COUNT=0

while IFS= read -r -d '' folder_md; do
  folder_dir="$(dirname "$folder_md")"
  while IFS= read -r ref; do
    [[ -z "$ref" ]] && continue
    case "$ref" in
      dir|doc|module|script|config|entry|test|n/a|"(empty)")
        continue
        ;;
      http:*|https:*|*://*|\#*)
        continue
        ;;
    esac
    if [[ "$ref" == /* ]]; then
      candidate="$ref"
    else
      candidate="$folder_dir/$ref"
    fi
    if [[ ! -e "$candidate" ]]; then
      echo "STALE: $folder_md references missing path: $ref"
      EXIT_CODE=1
    fi
  done < <(grep -oE '`[^`]+`' "$folder_md" | tr -d '`' || true)
done < <(find "$WORKSPACE" -type f -name '.folder.md' -print0)

while IFS= read -r -d '' source_file; do
  if grep -q '\[Spike\]' "$source_file"; then
    echo "SPIKE: $source_file still has [Spike] marker"
    SPIKE_COUNT=$((SPIKE_COUNT + 1))
  fi
done < <(find "$WORKSPACE" -type f \
  \( -name '*.py' -o -name '*.sh' -o -name '*.js' -o -name '*.jsx' -o -name '*.ts' -o -name '*.tsx' -o -name '*.go' -o -name '*.rs' -o -name '*.sql' \) -print0)

if [[ "$SPIKE_COUNT" -gt 0 ]]; then
  echo "Total SPIKE markers: $SPIKE_COUNT"
fi

exit "$EXIT_CODE"
