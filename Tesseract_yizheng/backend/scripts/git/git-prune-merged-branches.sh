#!/usr/bin/env sh
# [INPUT]: 依赖 git 的 local branches、worktree metadata 与 merged graph 信息
# [OUTPUT]: 对外提供已合并本地分支的 dry-run 列表与可执行删除入口
# [POS]: scripts/git/ 的仓库治理脚本，统一并发开发分支的收口规则
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

set -eu

BASE_BRANCH="main"
APPLY=0
PROTECTED_BRANCHES="main master"

usage() {
  cat <<'EOF'
Usage: git-prune-merged-branches.sh [--base <branch>] [--protect <branch>] [--apply]

Rules:
  - only local branches already merged into the base branch
  - never delete the current branch
  - never delete branches attached to any worktree
  - never delete protected branches

Examples:
  ./scripts/git-prune-merged-branches.sh
  ./scripts/git-prune-merged-branches.sh --apply
  ./scripts/git-prune-merged-branches.sh --base release --protect develop --apply
EOF
}

is_protected_branch() {
  branch="$1"

  for protected in $PROTECTED_BRANCHES; do
    if [ "$branch" = "$protected" ]; then
      return 0
    fi
  done

  return 1
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --base)
      shift
      if [ "$#" -eq 0 ]; then
        echo "Missing value for --base" >&2
        exit 1
      fi
      BASE_BRANCH="$1"
      ;;
    --protect)
      shift
      if [ "$#" -eq 0 ]; then
        echo "Missing value for --protect" >&2
        exit 1
      fi
      PROTECTED_BRANCHES="$PROTECTED_BRANCHES $1"
      ;;
    --apply)
      APPLY=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac

  shift
done

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "This script must run inside a git repository." >&2
  exit 1
fi

if ! git show-ref --verify --quiet "refs/heads/$BASE_BRANCH"; then
  echo "Base branch does not exist locally: $BASE_BRANCH" >&2
  exit 1
fi

CURRENT_BRANCH="$(git branch --show-current)"
WORKTREE_BRANCHES="$(git worktree list --porcelain | awk '/^branch / { sub("^refs/heads/", "", $2); print $2 }')"
CANDIDATE_BRANCHES="$(git for-each-ref --merged "$BASE_BRANCH" --format='%(refname:short)' refs/heads)"
PRUNE_LIST=""
PRUNE_COUNT=0

printf 'Base branch: %s\n' "$BASE_BRANCH"
printf 'Protected branches: %s\n' "$PROTECTED_BRANCHES"
printf 'Mode: %s\n' "$( [ "$APPLY" -eq 1 ] && printf 'apply' || printf 'dry-run' )"

for branch in $CANDIDATE_BRANCHES; do
  if [ "$branch" = "$BASE_BRANCH" ]; then
    continue
  fi

  if [ -n "$CURRENT_BRANCH" ] && [ "$branch" = "$CURRENT_BRANCH" ]; then
    continue
  fi

  if is_protected_branch "$branch"; then
    continue
  fi

  if printf '%s\n' "$WORKTREE_BRANCHES" | grep -Fx "$branch" >/dev/null 2>&1; then
    continue
  fi

  PRUNE_LIST="${PRUNE_LIST}${branch}
"
  PRUNE_COUNT=$((PRUNE_COUNT + 1))
done

if [ "$PRUNE_COUNT" -eq 0 ]; then
  echo "No merged local branches to prune."
  exit 0
fi

echo "Branches ready to prune:"
printf '%s' "$PRUNE_LIST" | sed '/^$/d' | sed 's/^/  - /'

if [ "$APPLY" -ne 1 ]; then
  echo "Dry run only. Re-run with --apply to delete these branches."
  exit 0
fi

printf '%s' "$PRUNE_LIST" | sed '/^$/d' | while IFS= read -r branch; do
  git branch -d "$branch"
done

printf 'Deleted %s merged local branches.\n' "$PRUNE_COUNT"
