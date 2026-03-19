#!/usr/bin/env python3
"""PreToolUse hook executor for hookify plugin (Copilot CLI).

This script is called by Copilot CLI before any tool executes.
It reads .github/hookify.*.local.md files and evaluates rules.
"""

import os
import sys
import json

# Add plugin root to Python path for imports
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PLUGIN_ROOT = os.path.dirname(SCRIPT_DIR)
parent_dir = os.path.dirname(PLUGIN_ROOT)
for p in [parent_dir, PLUGIN_ROOT]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from hookify.core.config_loader import load_rules
    from hookify.core.rule_engine import RuleEngine
except ImportError as e:
    print(json.dumps({}), file=sys.stdout)
    sys.exit(0)


def main():
    """Main entry point for preToolUse hook."""
    try:
        input_data = json.load(sys.stdin)

        # Copilot CLI uses toolName instead of tool_name
        tool_name = input_data.get('toolName', '')

        event = None
        if tool_name == 'powershell':
            event = 'bash'
        elif tool_name in ['edit', 'create']:
            event = 'file'

        rules = load_rules(event=event)
        engine = RuleEngine()
        result = engine.evaluate_rules(rules, input_data)

        # Copilot CLI preToolUse only processes permissionDecision
        print(json.dumps(result), file=sys.stdout)

    except Exception:
        print(json.dumps({}), file=sys.stdout)

    finally:
        sys.exit(0)


if __name__ == '__main__':
    main()
