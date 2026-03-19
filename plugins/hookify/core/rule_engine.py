#!/usr/bin/env python3
"""Rule evaluation engine for hookify plugin."""

import re
import sys
from functools import lru_cache
from typing import List, Dict, Any, Optional

# Import from local module
from hookify.core.config_loader import Rule, Condition


# Cache compiled regexes (max 128 patterns)
@lru_cache(maxsize=128)
def compile_regex(pattern: str) -> re.Pattern:
    """Compile regex pattern with caching.

    Args:
        pattern: Regex pattern string

    Returns:
        Compiled regex pattern
    """
    return re.compile(pattern, re.IGNORECASE)


class RuleEngine:
    """Evaluates rules against hook input data."""

    def __init__(self):
        """Initialize rule engine."""
        # No need for instance cache anymore - using global lru_cache
        pass

    def evaluate_rules(self, rules: List[Rule], input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate all rules and return combined results.

        Checks all rules and accumulates matches. Blocking rules take priority
        over warning rules. All matching rule messages are combined.

        Args:
            rules: List of Rule objects to evaluate
            input_data: Hook input JSON (toolName, toolArgs, etc.)

        Returns:
            Response dict with permissionDecision for preToolUse, or empty dict.
        """
        hook_event = input_data.get('event', '')
        blocking_rules = []
        warning_rules = []

        for rule in rules:
            if self._rule_matches(rule, input_data):
                if rule.action == 'block':
                    blocking_rules.append(rule)
                else:
                    warning_rules.append(rule)

        # If any blocking rules matched, block the operation
        if blocking_rules:
            messages = [f"**[{r.name}]**\n{r.message}" for r in blocking_rules]
            combined_message = "\n\n".join(messages)

            if hook_event == 'preToolUse':
                return {
                    "permissionDecision": "deny"
                }
            else:
                return {}

        # If only warnings, allow operation (Copilot CLI hooks can't inject messages)
        # No matches - allow operation
        return {}

    def _rule_matches(self, rule: Rule, input_data: Dict[str, Any]) -> bool:
        """Check if rule matches input data.

        Args:
            rule: Rule to evaluate
            input_data: Hook input data

        Returns:
            True if rule matches, False otherwise
        """
        # Extract tool information (Copilot CLI format)
        tool_name = input_data.get('toolName', '')
        tool_input = input_data.get('toolArgs', {})

        # Check tool matcher if specified
        if rule.tool_matcher:
            if not self._matches_tool(rule.tool_matcher, tool_name):
                return False

        # If no conditions, don't match
        # (Rules must have at least one condition to be valid)
        if not rule.conditions:
            return False

        # All conditions must match
        for condition in rule.conditions:
            if not self._check_condition(condition, tool_name, tool_input, input_data):
                return False

        return True

    def _matches_tool(self, matcher: str, tool_name: str) -> bool:
        """Check if tool_name matches the matcher pattern.

        Args:
            matcher: Pattern like "Bash", "Edit|Write", "*"
            tool_name: Actual tool name

        Returns:
            True if matches
        """
        if matcher == '*':
            return True

        # Split on | for OR matching
        patterns = matcher.split('|')
        return tool_name in patterns

    def _check_condition(self, condition: Condition, tool_name: str,
                        tool_input: Dict[str, Any], input_data: Dict[str, Any] = None) -> bool:
        """Check if a single condition matches.

        Args:
            condition: Condition to check
            tool_name: Tool being used
            tool_input: Tool input dict
            input_data: Full hook input data (for Stop events, etc.)

        Returns:
            True if condition matches
        """
        # Extract the field value to check
        field_value = self._extract_field(condition.field, tool_name, tool_input, input_data)
        if field_value is None:
            return False

        # Apply operator
        operator = condition.operator
        pattern = condition.pattern

        if operator == 'regex_match':
            return self._regex_match(pattern, field_value)
        elif operator == 'contains':
            return pattern in field_value
        elif operator == 'equals':
            return pattern == field_value
        elif operator == 'not_contains':
            return pattern not in field_value
        elif operator == 'starts_with':
            return field_value.startswith(pattern)
        elif operator == 'ends_with':
            return field_value.endswith(pattern)
        else:
            # Unknown operator
            return False

    def _extract_field(self, field: str, tool_name: str,
                      tool_input: Dict[str, Any], input_data: Dict[str, Any] = None) -> Optional[str]:
        """Extract field value from tool input or hook input data.

        Copilot CLI tool names: powershell, edit, create, view, grep, glob, etc.

        Args:
            field: Field name like "command", "new_text", "file_path", "reason", "transcript"
            tool_name: Tool being used (Copilot CLI tool names)
            tool_input: Tool args dict
            input_data: Full hook input (for accessing event-specific fields)

        Returns:
            Field value as string, or None if not found
        """
        # Direct tool_input fields
        if field in tool_input:
            value = tool_input[field]
            if isinstance(value, str):
                return value
            return str(value)

        # For non-tool events, check input_data
        if input_data:
            if field == 'reason':
                return input_data.get('reason', '')
            elif field == 'transcript':
                transcript_path = input_data.get('transcript_path')
                if transcript_path:
                    try:
                        with open(transcript_path, 'r') as f:
                            return f.read()
                    except (FileNotFoundError, PermissionError, IOError, OSError, UnicodeDecodeError) as e:
                        print(f"Warning: Error reading transcript {transcript_path}: {e}", file=sys.stderr)
                        return ''
            elif field == 'user_prompt':
                return input_data.get('user_prompt', input_data.get('prompt', ''))

        # Handle by Copilot CLI tool names
        if tool_name == 'powershell':
            if field == 'command':
                return tool_input.get('command', '')

        elif tool_name == 'edit':
            if field == 'content':
                return tool_input.get('new_str') or tool_input.get('old_str', '')
            elif field in ('new_text', 'new_string', 'new_str'):
                return tool_input.get('new_str', '')
            elif field in ('old_text', 'old_string', 'old_str'):
                return tool_input.get('old_str', '')
            elif field == 'file_path':
                return tool_input.get('path', '')

        elif tool_name == 'create':
            if field in ('content', 'new_text', 'file_text'):
                return tool_input.get('file_text', '')
            elif field == 'file_path':
                return tool_input.get('path', '')

        return None

    def _regex_match(self, pattern: str, text: str) -> bool:
        """Check if pattern matches text using regex.

        Args:
            pattern: Regex pattern
            text: Text to match against

        Returns:
            True if pattern matches
        """
        try:
            # Use cached compiled regex (LRU cache with max 128 patterns)
            regex = compile_regex(pattern)
            return bool(regex.search(text))

        except re.error as e:
            print(f"Invalid regex pattern '{pattern}': {e}", file=sys.stderr)
            return False


# For testing
if __name__ == '__main__':
    from hookify.core.config_loader import Condition, Rule

    # Test rule evaluation
    rule = Rule(
        name="test-rm",
        enabled=True,
        event="bash",
        conditions=[
            Condition(field="command", operator="regex_match", pattern=r"rm\s+-rf")
        ],
        message="Dangerous rm command!"
    )

    engine = RuleEngine()

    # Test matching input (Copilot CLI format)
    test_input = {
        "event": "preToolUse",
        "toolName": "powershell",
        "toolArgs": {
            "command": "rm -rf /tmp/test"
        }
    }

    result = engine.evaluate_rules([rule], test_input)
    print("Match result:", result)

    # Test non-matching input
    test_input2 = {
        "event": "preToolUse",
        "toolName": "powershell",
        "toolArgs": {
            "command": "ls -la"
        }
    }

    result2 = engine.evaluate_rules([rule], test_input2)
    print("Non-match result:", result2)
