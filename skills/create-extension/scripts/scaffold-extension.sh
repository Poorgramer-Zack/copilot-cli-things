#!/bin/bash
# Scaffold a new Copilot CLI extension directory
#
# Usage:
#   bash scaffold-extension.sh <extension-name>
#
# Creates .github/extensions/<name>/extension.mjs from the template.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_FILE="$SCRIPT_DIR/../examples/extension-template.mjs"

if [ $# -lt 1 ]; then
    echo "Usage: bash scaffold-extension.sh <extension-name>"
    echo "Example: bash scaffold-extension.sh my-tools"
    exit 1
fi

NAME="$1"

# Validate extension name
if [[ ! "$NAME" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    echo "Error: Extension name must contain only letters, numbers, hyphens, and underscores."
    exit 1
fi

# Find git root
GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "Error: Not inside a git repository. Run this from within a git repo."
    exit 1
fi

TARGET_DIR="$GIT_ROOT/.github/extensions/$NAME"

if [ -d "$TARGET_DIR" ]; then
    echo "Error: Extension directory already exists: $TARGET_DIR"
    exit 1
fi

if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "Error: Template file not found: $TEMPLATE_FILE"
    exit 1
fi

mkdir -p "$TARGET_DIR"
cp "$TEMPLATE_FILE" "$TARGET_DIR/extension.mjs"

echo "✓ Extension scaffolded at: $TARGET_DIR/extension.mjs"
echo ""
echo "Next steps:"
echo "  1. Edit $TARGET_DIR/extension.mjs"
echo "  2. Run extensions_reload() in Copilot CLI"
echo "  3. Run extensions_manage({ operation: \"inspect\", name: \"$NAME\" }) to verify"
