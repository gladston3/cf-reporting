#!/usr/bin/env bash
# Stop hook: Verify code quality before allowing session to end
#
# Checks that TypeScript compiles and tests pass before Claude can
# stop working. Only enforces when src/ files have been modified.
#
# Exit 0: allow stop
# Exit 2: block stop (reason on STDERR)
#
# ESCAPE HATCH: Create .claude/SKIP_STOP_GATE to bypass this check.
# Delete it when you're ready to re-enable enforcement.

set -euo pipefail

# === Normalize to project root ===
ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$ROOT" || exit 0

# Escape hatch
if [[ -f ".claude/SKIP_STOP_GATE" ]]; then
  echo "Stop gate bypassed (.claude/SKIP_STOP_GATE exists)" >&2
  exit 0
fi

# Only enforce if src/ files were modified
CHANGED=$(git diff --name-only HEAD 2>/dev/null || git diff --name-only 2>/dev/null || echo "")
STAGED=$(git diff --cached --name-only 2>/dev/null || echo "")
ALL_CHANGED=$(printf "%s\n%s" "$CHANGED" "$STAGED" | sort -u)

if ! echo "$ALL_CHANGED" | grep -q "^src/"; then
  exit 0
fi

ERRORS=""

# Check 1: TypeScript compilation
if command -v npx &>/dev/null && [[ -f "tsconfig.json" ]]; then
  if ! npx tsc --noEmit 2>/dev/null; then
    ERRORS="${ERRORS}\n- TypeScript compilation failed. Run 'npx tsc --noEmit' to see errors."
  fi
fi

# Check 2: Tests pass
if command -v npx &>/dev/null && [[ -f "package.json" ]]; then
  if ! npx vitest run --reporter=dot 2>/dev/null; then
    ERRORS="${ERRORS}\n- Tests are failing. Run 'npx vitest run' to see failures."
  fi
fi

if [[ -n "$ERRORS" ]]; then
  echo -e "BLOCKED: Cannot finish with failing checks:${ERRORS}\n\nFix these issues, or create .claude/SKIP_STOP_GATE to bypass temporarily." >&2
  exit 2
fi

exit 0
