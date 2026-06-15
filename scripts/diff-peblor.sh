#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat >&2 <<'EOF'
Usage: diff-peblor.sh [options] [source] [target]

Compare, sync, and prune files between two repositories.

Options:
  --sync              Copy files from source to target
  --prune             Delete files in target not present in source
  --push              Sync -> check -> commit -> push in target
  --check [dir]       Run npm run check in directory
  --diff              Show diff between source and target (default)
  --dry-run           Show what would be changed without making changes
  --force             Skip confirmation prompts
  --help              Show this help

Arguments:
  source    First repo directory (default: auto-detect current repo)
  target    Second repo directory (default: ../<peer-repo>)

Rules:
  - .gitignore is respected on both sides (files must be tracked or
    untracked-and-unignored to be considered)
  - Files matching "merge=ours" in either .gitattributes are never
    synced or pruned
  - All destructive operations prompt unless --force is set
EOF
  exit 0
}

# ===========================================================================
#  LOGGING
# ===========================================================================
RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; CYAN=$'\033[36;1m'
BOLD=$'\033[1m'; RESET=$'\033[0m'; GREY=$'\033[90m'

info()    { echo "$*"; }
warn()    { echo "${YELLOW}${*}${RESET}" >&2; }
error()   { echo "${RED}${*}${RESET}" >&2; }
success() { echo "${GREEN}${*}${RESET}"; }
header()  { echo ""; echo "${CYAN}--- ${*} ---${RESET}"; }
muted()   { echo "${GREY}${*}${RESET}"; }

confirm_or_exit() {
  local msg="$1"
  echo ""
  read -p "${YELLOW}${msg} [y/N]${RESET} " -r reply
  if [[ "$reply" != [yY] && "$reply" != [yY][eE][sS] ]]; then
    echo "${YELLOW}  Aborted.${RESET}"
    exit 1
  fi
}

# ===========================================================================
#  FILE LISTING & PATTERNS
# ===========================================================================

# Build list of all non-ignored files in a repo
# (tracked + untracked non-ignored)
build_file_list() {
  local repo="$1" out="$2"
  git -C "$repo" ls-files --cached --others --exclude-standard | sort -u > "$out"
}

# Read merge=ours patterns from a repo's .gitattributes
read_ours_patterns() {
  local repo="$1"
  local gitattr="$repo/.gitattributes"
  if [ -f "$gitattr" ]; then
    while IFS=$' \t' read -r pattern attrs; do
      [[ "$pattern" == \#* || -z "$pattern" ]] && continue
      if [[ " $attrs " == *" merge=ours "* || "$attrs" == "merge=ours" ]]; then
        echo "$pattern"
      fi
    done < "$gitattr"
  fi
}

# Check if a path matches any merge=ours pattern
is_keep_ours() {
  local f="$1"; shift
  for pattern in "$@"; do
    case "$f" in
      $pattern) return 0 ;;
    esac
  done
  return 1
}

# ===========================================================================
#  CLASSIFICATION
# ===========================================================================

# Classifies files between source and target into three arrays:
#   FILES_COMMON_DIFF — paths in both repos with different content
#   FILES_ONLY_SRC    — paths only in source (not merge=ours)
#   FILES_ONLY_TGT    — paths only in target (not merge=ours)
# Also exports:
#   OURS_PATTERNS     — combined merge=ours patterns from both repos
classify() {
  local src="$1" tgt="$2"

  local fs=$(mktemp) ft=$(mktemp)
  local only_src=$(mktemp) only_tgt=$(mktemp) common=$(mktemp)

  build_file_list "$src" "$fs"
  build_file_list "$tgt" "$ft"

  # Union of merge=ours patterns from both repos
  OURS_PATTERNS=()
  while IFS= read -r p; do OURS_PATTERNS+=("$p"); done < <(read_ours_patterns "$src")
  while IFS= read -r p; do OURS_PATTERNS+=("$p"); done < <(read_ours_patterns "$tgt")

  # Deduplicate (bash 3.2-safe)
  if [ ${#OURS_PATTERNS[@]} -gt 1 ]; then
    local p s
    local -a _seen _deduped
    _seen=()
    _deduped=()
    for p in "${OURS_PATTERNS[@]}"; do
      local _found=false
      for s in "${_seen[@]+"${_seen[@]}"}"; do
        [ "$s" = "$p" ] && { _found=true; break; }
      done
      ! $_found && _seen+=("$p") && _deduped+=("$p")
    done
    OURS_PATTERNS=("${_deduped[@]}")
  fi

  # Classify: common, only-src, only-tgt
  comm -23 "$fs" "$ft" > "$only_src"
  comm -13 "$fs" "$ft" > "$only_tgt"
  comm -12 "$fs" "$ft" > "$common"

  # Only-in-source: exclude merge=ours
  FILES_ONLY_SRC=()
  while IFS= read -r f; do
    is_keep_ours "$f" "${OURS_PATTERNS[@]}" || FILES_ONLY_SRC+=("$f")
  done < "$only_src"

  # Only-in-target: exclude merge=ours
  FILES_ONLY_TGT=()
  while IFS= read -r f; do
    is_keep_ours "$f" "${OURS_PATTERNS[@]}" || FILES_ONLY_TGT+=("$f")
  done < "$only_tgt"

  # Common differing: exclude merge=ours
  FILES_COMMON_DIFF=()
  while IFS= read -r f; do
    is_keep_ours "$f" "${OURS_PATTERNS[@]}" && continue
    if ! diff -q "$src/$f" "$tgt/$f" >/dev/null 2>&1; then
      FILES_COMMON_DIFF+=("$f")
    fi
  done < "$common"

  rm -f "$fs" "$ft" "$only_src" "$only_tgt" "$common"
}

# ===========================================================================
#  MODE: diff
# ===========================================================================

do_diff() {
  classify "$SOURCE" "$TARGET"

  echo ""
  echo "─" "${BOLD}$(basename "$SOURCE")${RESET}  ↔  ${BOLD}$(basename "$TARGET")${RESET}"
  echo ""

  if [ ${#OURS_PATTERNS[@]} -gt 0 ]; then
    muted "protected (merge=ours):"
    for p in "${OURS_PATTERNS[@]}"; do muted "  $p"; done
    echo ""
  fi

  # Differing
  if [ ${#FILES_COMMON_DIFF[@]} -eq 0 ]; then
    muted "  common files differ: (none — all in sync)"
  else
    echo "${BOLD}  differing (${#FILES_COMMON_DIFF[@]})${RESET}"
    for f in "${FILES_COMMON_DIFF[@]}"; do echo "    $f"; done
  fi
  echo ""

  # Only in source
  if [ ${#FILES_ONLY_SRC[@]} -gt 0 ]; then
    echo "${BOLD}  only in source (${#FILES_ONLY_SRC[@]})${RESET}"
    for f in "${FILES_ONLY_SRC[@]}"; do echo "    $f"; done
  else
    muted "  only in source: (none)"
  fi
  echo ""

  # Only in target
  if [ ${#FILES_ONLY_TGT[@]} -gt 0 ]; then
    echo "${BOLD}  only in target (${#FILES_ONLY_TGT[@]})${RESET}"
    for f in "${FILES_ONLY_TGT[@]}"; do echo "    $f"; done
  else
    muted "  only in target: (none)"
  fi
  echo ""

  if [ ${#FILES_COMMON_DIFF[@]} -eq 0 ] && [ ${#FILES_ONLY_SRC[@]} -eq 0 ] && [ ${#FILES_ONLY_TGT[@]} -eq 0 ]; then
    success "  Everything in sync."
  else
    muted "  (use --sync to copy source→target, --prune to clean target-only files)"
  fi
}

# ===========================================================================
#  MODE: sync
# ===========================================================================

do_sync() {
  classify "$SOURCE" "$TARGET"

  local total=$(( ${#FILES_COMMON_DIFF[@]} + ${#FILES_ONLY_SRC[@]} ))

  if [ $total -eq 0 ]; then
    info "  Nothing to sync."
    return 0
  fi

  echo ""
  echo "  Files to sync from $(basename "$SOURCE") → $(basename "$TARGET")" "($total):"
  for f in "${FILES_COMMON_DIFF[@]}"; do echo "    update  $f"; done
  for f in "${FILES_ONLY_SRC[@]}"; do echo "    create  $f"; done
  echo ""

  if ! $FORCE; then
    confirm_or_exit "Proceed with sync?"
  fi

  for f in "${FILES_COMMON_DIFF[@]}" "${FILES_ONLY_SRC[@]}"; do
    mkdir -p "$(dirname "$TARGET/$f")"
    cp "$SOURCE/$f" "$TARGET/$f"
  done

  success "  $total file(s) synced to $(basename "$TARGET")."
}

# ===========================================================================
#  MODE: prune
# ===========================================================================

do_prune() {
  classify "$SOURCE" "$TARGET"

  if [ ${#FILES_ONLY_TGT[@]} -eq 0 ]; then
    info "  Nothing to prune."
    return 0
  fi

  echo ""
  echo "  Files to prune from $(basename "$TARGET")" "(${#FILES_ONLY_TGT[@]}):"
  for f in "${FILES_ONLY_TGT[@]}"; do echo "    $f"; done
  echo ""

  if ! $FORCE; then
    confirm_or_exit "Remove these files from target?"
  fi

  local pruned=0
  for f in "${FILES_ONLY_TGT[@]}"; do
    local path="$TARGET/$f"
    rm -f "$path"
    ((pruned++))
    # Clean up empty parent directories up to target root
    local dir="$(dirname "$path")"
    while [ "$dir" != "$TARGET" ]; do
      rmdir "$dir" 2>/dev/null || break
      dir="$(dirname "$dir")"
    done
  done

  success "  $pruned file(s) pruned from $(basename "$TARGET")."
}

# ===========================================================================
#  MODE: check
# ===========================================================================

do_check() {
  local dir="$1"
  info "  Running npm run check in $(basename "$dir")..."
  echo ""
  if ! (cd "$dir" && npm run check); then
    echo ""
    error "  Checks failed in $(basename "$dir")."
    return 1
  fi
  success "  All checks passed in $(basename "$dir")."
}

# ===========================================================================
#  MODE: push  (sync → check → commit → push)
# ===========================================================================

do_push() {
  classify "$SOURCE" "$TARGET"

  local changed_count=${#FILES_COMMON_DIFF[@]}
  local created_count=${#FILES_ONLY_SRC[@]}
  local total=$(( changed_count + created_count ))

  # -- sync --
  if [ $total -gt 0 ]; then
    echo ""
    echo "  Files to sync ($total):"
    for f in "${FILES_COMMON_DIFF[@]}"; do echo "    update  $f"; done
    for f in "${FILES_ONLY_SRC[@]}"; do echo "    create  $f"; done
    echo ""
    if ! $FORCE; then
      confirm_or_exit "Proceed with push?"
    fi
    for f in "${FILES_COMMON_DIFF[@]}" "${FILES_ONLY_SRC[@]}"; do
      mkdir -p "$(dirname "$TARGET/$f")"
      cp "$SOURCE/$f" "$TARGET/$f"
    done
    info "  Synced $total file(s)."
  else
    info "  Nothing to sync."
  fi

  # -- stage --
  header "Staging changes in $(basename "$TARGET")"
  (cd "$TARGET" && git add -A)

  if (cd "$TARGET" && git diff --cached --quiet); then
    info "  No changes to commit."
    return 0
  fi

  # -- check --
  header "Running checks in $(basename "$TARGET")"
  if ! (cd "$TARGET" && npm run check); then
    echo ""
    error "Checks failed. Unstaging changes."
    (cd "$TARGET" && git reset HEAD . >/dev/null 2>&1)
    exit 1
  fi
  success "  Checks passed."

  # -- commit --
  header "Committing in $(basename "$TARGET")"
  local msg="sync from $(basename "$SOURCE")"
  local details=""
  if [ "$changed_count" -gt 0 ]; then
    details="$details"$'\n'"${changed_count} changed"
  fi
  if [ "$created_count" -gt 0 ]; then
    details="$details"$'\n'"${created_count} created"
  fi
  [ -n "$details" ] && msg="$msg —$details"

  (cd "$TARGET" && git commit -m "$msg" >/dev/null)

  # -- push --
  header "Pushing to $(basename "$TARGET")"
  (cd "$TARGET" && git push)

  echo ""
  success "✓ Synced and pushed to $(basename "$TARGET")."
}

# ===========================================================================
#  MAIN
# ===========================================================================

MODE="diff"
DRY_RUN=false
FORCE=false
POS_ARGS=()

for arg in "$@"; do
  case "$arg" in
    --sync|--prune|--push|--diff) MODE="${arg#--}" ;;
    --dry-run) DRY_RUN=true ;;
    --force) FORCE=true ;;
    --check) MODE="check" ;;
    --help|-h) usage ;;
    --*) error "  Unknown flag: $arg"; usage; exit 1 ;;
    *) POS_ARGS+=("$arg") ;;
  esac
done

# Auto-detect repos
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CWD_REPO="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -f "$CWD_REPO/peblor.config.json" ]; then
  DEFAULT_PEER="$(cd "$CWD_REPO/../peblor" && pwd 2>/dev/null)" || DEFAULT_PEER="$CWD_REPO/../peblor"
else
  DEFAULT_PEER="$(cd "$CWD_REPO/../nlg-site" && pwd 2>/dev/null)" || DEFAULT_PEER="$CWD_REPO/../nlg-site"
fi

if [ "$MODE" = "check" ]; then
  CHECK_DIR="${POS_ARGS[0]:-$CWD_REPO}"
  do_check "$CHECK_DIR"
  exit $?
fi

SOURCE="${POS_ARGS[0]:-$CWD_REPO}"
TARGET="${POS_ARGS[1]:-$DEFAULT_PEER}"

SOURCE="$(cd "$SOURCE" 2>/dev/null && pwd)" || { error "  Source not found: $SOURCE"; exit 1; }
TARGET="$(cd "$TARGET" 2>/dev/null && pwd)" || { error "  Target not found: $TARGET"; exit 1; }

if [ "$SOURCE" = "$TARGET" ]; then
  error "  Source and target are the same directory."
  exit 1
fi

for dir in "$SOURCE" "$TARGET"; do
  name="$(basename "$dir")"
  git -C "$dir" rev-parse --git-dir >/dev/null 2>&1 || {
    error "  $name is not a git repository."
    exit 1
  }
done

case "$MODE" in
  diff) do_diff ;;
  sync)
    if $DRY_RUN; then
      classify "$SOURCE" "$TARGET"
      dry_total=$(( ${#FILES_COMMON_DIFF[@]} + ${#FILES_ONLY_SRC[@]} ))
      if [ $dry_total -eq 0 ]; then
        info "  Nothing to sync."
      else
        echo "  Would sync $dry_total file(s) from $(basename "$SOURCE") → $(basename "$TARGET"):"
        for f in "${FILES_COMMON_DIFF[@]+"${FILES_COMMON_DIFF[@]}"}"; do echo "    update  $f"; done
        for f in "${FILES_ONLY_SRC[@]+"${FILES_ONLY_SRC[@]}"}"; do echo "    create  $f"; done
      fi
    else
      do_sync
    fi
    ;;
  prune)
    if $DRY_RUN; then
      classify "$SOURCE" "$TARGET"
      if [ ${#FILES_ONLY_TGT[@]} -eq 0 ]; then
        info "  Nothing to prune."
      else
        echo "  Would prune ${#FILES_ONLY_TGT[@]} file(s) from $(basename "$TARGET"):"
        for f in "${FILES_ONLY_TGT[@]+"${FILES_ONLY_TGT[@]}"}"; do echo "    $f"; done
      fi
    else
      do_prune
    fi
    ;;
  push)
    if $DRY_RUN; then
      classify "$SOURCE" "$TARGET"
      dry_total=$(( ${#FILES_COMMON_DIFF[@]} + ${#FILES_ONLY_SRC[@]} ))
      echo "${YELLOW}(dry run)${RESET}"
      echo "  Would sync $dry_total file(s), stage, check, commit, and push to $(basename "$TARGET")."
      if [ $dry_total -gt 0 ]; then
        for f in "${FILES_COMMON_DIFF[@]+"${FILES_COMMON_DIFF[@]}"}"; do echo "    update  $f"; done
        for f in "${FILES_ONLY_SRC[@]+"${FILES_ONLY_SRC[@]}"}"; do echo "    create  $f"; done
      fi
    else
      do_push
    fi
    ;;
esac
