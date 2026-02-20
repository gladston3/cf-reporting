#!/usr/bin/env bash
# PreToolUse hook: Prevent accidental secret exposure
#
# Blocks Write/Edit/MultiEdit operations that contain patterns matching
# API tokens, secrets, or credentials in the file content.
#
# Tool input field names:
#   Write:     .file_path, .content
#   Edit:      .path, .new_string
#   MultiEdit: .path, .edits[].new_string
#
# Exempts only gitignored files (NOT .env.example, which is committed).
#
# Exit 0: allow
# Exit 2: block (reason on STDERR)

set -euo pipefail

# === Normalize to project root ===
ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$ROOT" || exit 0

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input // empty')

# Only check Write, Edit, MultiEdit
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" && "$TOOL_NAME" != "MultiEdit" ]]; then
  exit 0
fi

# Extract file path
FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // .path // empty')

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Exempt gitignored files (e.g., .env, .env.local — but NOT .env.example)
# This is safer than pattern matching specific filenames.
if git check-ignore -q "$FILE_PATH" 2>/dev/null; then
  exit 0
fi

# Extract content based on tool type
CONTENT=""
case "$TOOL_NAME" in
  Write)
    CONTENT=$(echo "$TOOL_INPUT" | jq -r '.content // empty')
    ;;
  Edit)
    CONTENT=$(echo "$TOOL_INPUT" | jq -r '.new_string // empty')
    ;;
  MultiEdit)
    # Concatenate all new_string values from the edits array
    CONTENT=$(echo "$TOOL_INPUT" | jq -r '.edits[]?.new_string // empty' 2>/dev/null | tr '\n' ' ')
    ;;
esac

if [[ -z "$CONTENT" ]]; then
  exit 0
fi

# Check for literal secret-like strings near key identifiers
# Matches: api_key = "abc123...", token: 'longstring', etc.
if echo "$CONTENT" | grep -iP '(api_key|api_token|secret_key|password|auth_token|encryption_key)\s*[:=]\s*["\x27][a-zA-Z0-9_\-]{20,}' >/dev/null 2>&1; then
  echo "BLOCKED: Content appears to contain a hardcoded secret or API token. Use environment variables instead. Store secrets in .env.local (gitignored) and reference via process.env." >&2
  exit 2
fi

# Check for Bearer token literals (not template strings or variable references)
# Allow: Bearer \${token}, Bearer ${process.env.TOKEN}
# Block: Bearer abc123def456ghi789jkl012mno345pqr
if echo "$CONTENT" | grep -P 'Bearer [a-zA-Z0-9_\-]{30,}' | grep -vP 'Bearer \$' >/dev/null 2>&1; then
  echo "BLOCKED: Content contains what appears to be a literal Bearer token. Use a variable reference instead." >&2
  exit 2
fi

exit 0
