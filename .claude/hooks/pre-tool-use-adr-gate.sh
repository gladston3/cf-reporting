#!/usr/bin/env bash
# PreToolUse hook: Enforce architecture-before-implementation
#
# Blocks Write/Edit on gated files unless an active, approved ADR exists.
# Uses .claude/ACTIVE_ADR pointer file for per-feature gating.
#
# Gated paths: src/**, prisma/schema.prisma
# Exempt: tests, config, docs, styling, docker, .claude (see list)
#
# Exit 0: allow
# Exit 2: block (reason on STDERR — stdout is ignored on exit 2)

set -euo pipefail

# === Normalize to project root ===
ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$ROOT" || exit 0

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input // empty')

# Only gate Write, Edit, MultiEdit
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" && "$TOOL_NAME" != "MultiEdit" ]]; then
  exit 0
fi

# Extract file path (Write uses file_path, Edit uses path)
FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // .path // empty')

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Convert absolute path to repo-relative
FILE_REL="${FILE_PATH#$ROOT/}"

# === Exempt patterns (checked against repo-relative path) ===
EXEMPT_PATTERNS=(
  "tests/"
  "test/"
  ".test.ts"
  ".test.tsx"
  ".spec.ts"
  ".spec.tsx"
  ".css"
  ".scss"
  "tailwind.config"
  "docs/"
  "README"
  "CLAUDE.md"
  ".env"
  "docker-compose"
  "Dockerfile"
  "package.json"
  "package-lock.json"
  "tsconfig"
  ".config."
  "next.config"
  "prisma/migrations/"
  ".claude/"
  ".gitignore"
  "LICENSE"
  ".gitkeep"
)

for pattern in "${EXEMPT_PATTERNS[@]}"; do
  if [[ "$FILE_REL" == *"$pattern"* ]]; then
    exit 0
  fi
done

# === Gated paths (checked against repo-relative path) ===
GATED=false
if [[ "$FILE_REL" == src/* ]]; then
  GATED=true
elif [[ "$FILE_REL" == "prisma/schema.prisma" ]]; then
  GATED=true
fi

if [[ "$GATED" != "true" ]]; then
  exit 0
fi

# === Check for active ADR ===
ACTIVE_ADR_FILE=".claude/ACTIVE_ADR"

if [[ ! -f "$ACTIVE_ADR_FILE" ]]; then
  echo "BLOCKED: No active Architecture Decision Record. Run /architect first to create and approve an ADR before implementing. The ADR pointer file (.claude/ACTIVE_ADR) does not exist." >&2
  exit 2
fi

ADR_PATH=$(cat "$ACTIVE_ADR_FILE" | tr -d '[:space:]')

if [[ -z "$ADR_PATH" || ! -f "$ADR_PATH" ]]; then
  echo "BLOCKED: Active ADR pointer references '$ADR_PATH' but the file does not exist. Run /architect to create a new ADR." >&2
  exit 2
fi

# Verify the ADR is approved
if ! grep -q "## Status: APPROVED" "$ADR_PATH"; then
  echo "BLOCKED: ADR at '$ADR_PATH' exists but is not approved. It must contain '## Status: APPROVED' before implementation can begin." >&2
  exit 2
fi

# Advisory: check if this file is listed in the ADR (repo-relative comparison)
if ! grep -q "$FILE_REL" "$ADR_PATH" 2>/dev/null; then
  echo "NOTE: '$FILE_REL' is not listed in the ADR's File Changes section ($ADR_PATH). Consider updating the ADR." >&2
  # Do NOT block — this is advisory only. Blocking is pushed to QA review.
fi

# Active approved ADR exists — allow
exit 0
