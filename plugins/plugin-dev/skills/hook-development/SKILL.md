---
name: Hook Development
description: Hook development for Copilot CLI plugins: hooks.json, preToolUse/postToolUse/agentStop/sessionStart hooks, command hooks, event-driven validation, tool blocking, policy enforcement. Use when creating or debugging plugin hooks.
version: 0.1.0
---

# Hook Development for Copilot CLI Plugins

Create event-driven hooks that validate operations, enforce policies, add context, and integrate external tools into Copilot CLI workflows.

- Validate tool calls before execution (preToolUse)
- React to tool results (postToolUse)
- Enforce completion standards (agentStop, subagentStop)
- Load project context (sessionStart)
- Automate workflows across the development lifecycle

## Hook Types

### Command Hooks

Execute commands for deterministic checks:

```json
{
  "type": "command",
  "command": "bash hooks/scripts/validate.sh",
  "timeout": 60000
}
```

**Use for:**
- Fast deterministic validations
- File system operations
- External tool integrations
- Performance-critical checks

## Hook Configuration Formats

### Plugin hooks.json Format

**For plugin hooks** in `hooks/hooks.json`, use wrapper format:

```json
{
  "description": "Brief explanation of hooks (optional)",
  "hooks": {
    "preToolUse": [...],
    "agentStop": [...],
    "sessionStart": [...]
  }
}
```

**Key points:**
- `description` field is optional
- `hooks` field is required wrapper containing actual hook events
- This is the **plugin-specific format**

**Example:**
```json
{
  "description": "Validation hooks for code quality",
  "hooks": {
    "preToolUse": [
      {
        "matcher": "edit",
        "hooks": [
          {
            "type": "command",
            "command": "hooks/scripts/validate.sh"
          }
        ]
      }
    ]
  }
}
```

### Settings Format (Direct)

**For user settings** in `.github/settings.json`, use direct format:

```json
{
  "preToolUse": [...],
  "agentStop": [...],
  "sessionStart": [...]
}
```

**Key points:**
- No wrapper - events directly at top level
- No description field
- This is the **settings format**

**Important:** The examples below show the hook event structure that goes inside either format. For plugin hooks.json, wrap these in `{"hooks": {...}}`.

## Hook Events

### preToolUse

Execute before any tool runs. Use to approve, deny, or modify tool calls.

**Example:**
```json
{
  "preToolUse": [
    {
      "matcher": "edit|create",
      "hooks": [
        {
          "type": "command",
          "command": "bash hooks/scripts/validate-write.sh"
        }
      ]
    }
  ]
}
```

**Output for preToolUse:**
```json
{
  "permissionDecision": "allow|deny|ask",
  "updatedInput": {"field": "modified_value"}
}
```

### postToolUse

Execute after tool completes. Use to react to results, provide feedback, or log.

**Example:**
```json
{
  "postToolUse": [
    {
      "matcher": "edit",
      "hooks": [
        {
          "type": "command",
          "command": "bash hooks/scripts/check-edit.sh"
        }
      ]
    }
  ]
}
```

**Output behavior:**
- Exit 0: stdout shown in transcript
- Exit 2: stderr fed back to Copilot

### agentStop

Execute when main agent considers stopping. Use to validate completeness.

**Example:**
```json
{
  "agentStop": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "bash hooks/scripts/verify-completion.sh"
        }
      ]
    }
  ]
}
```

**Decision output:**
```json
{
  "decision": "approve|block",
  "reason": "Explanation"
}
```

### subagentStop

Execute when subagent considers stopping. Use to ensure subagent completed its task.

Similar to agentStop hook, but for subagents.

### userPromptSubmitted

Execute when user submits a prompt. Use to add context, validate, or block prompts.

**Example:**
```json
{
  "userPromptSubmitted": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "bash hooks/scripts/check-prompt.sh"
        }
      ]
    }
  ]
}
```

### sessionStart

Execute when Copilot CLI session begins. Use to load context and set environment.

**Example:**
```json
{
  "sessionStart": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "bash hooks/scripts/load-context.sh"
        }
      ]
    }
  ]
}
```

See `examples/load-context.sh` for complete example.

### sessionEnd

Execute when session ends. Use for cleanup, logging, and state preservation.

## Hook Output Format

### Standard Output (All Hooks)

```json
{
  "continue": true,
  "suppressOutput": false
}
```

- `continue`: If false, halt processing (default true)
- `suppressOutput`: Hide output from transcript (default false)

### Exit Codes

- `0` - Success (stdout shown in transcript)
- `2` - Blocking error (stderr fed back to Copilot)
- Other - Non-blocking error

## Hook Input Format

All hooks receive JSON via stdin with common fields:

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.txt",
  "cwd": "/current/working/dir",
  "permission_mode": "ask|allow",
  "event": "preToolUse"
}
```

**Event-specific fields:**

- **preToolUse/postToolUse:** `toolName`, `toolArgs`, `toolResult`
- **userPromptSubmitted:** `user_prompt`
- **agentStop/subagentStop:** `reason`

Access fields in prompts using `$TOOL_ARGS`, `$TOOL_RESULT`, `$USER_PROMPT`, etc.

## Environment Variables

Available in all command hooks:

- `$PROJECT_DIR` - Project root path
- `$PLUGIN_ROOT` - Plugin directory (use for portable paths)

**Always use relative paths or $PLUGIN_ROOT in hook commands for portability:**

```json
{
  "type": "command",
  "command": "bash hooks/scripts/validate.sh"
}
```

## Plugin Hook Configuration

In plugins, define hooks in `hooks/hooks.json`:

```json
{
  "preToolUse": [
    {
      "matcher": "edit|create",
      "hooks": [
        {
          "type": "command",
          "command": "bash hooks/scripts/validate-write.sh"
        }
      ]
    }
  ],
  "agentStop": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "bash hooks/scripts/verify-completion.sh"
        }
      ]
    }
  ],
  "sessionStart": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "bash hooks/scripts/load-context.sh",
          "timeout": 10000
        }
      ]
    }
  ]
}
```

Plugin hooks merge with user's hooks and run in parallel.

## Matchers

### Tool Name Matching

**Exact match:**
```json
"matcher": "edit"
```

**Multiple tools:**
```json
"matcher": "read|edit|create"
```

**Wildcard (all tools):**
```json
"matcher": "*"
```

**Regex patterns:**
```json
"matcher": "mcp__.*__delete.*"  // All MCP delete tools
```

**Note:** Matchers are case-sensitive.

### Common Patterns

```json
// All MCP tools
"matcher": "mcp__.*"

// Specific plugin's MCP tools
"matcher": "mcp__plugin_asana_.*"

// All file operations
"matcher": "read|edit|create"

// Execute commands only
"matcher": "powershell"
```

## Security Best Practices

### Input Validation

Always validate inputs in command hooks:

```bash
#!/bin/bash
set -euo pipefail

input=$(cat)
tool_name=$(echo "$input" | jq -r '.toolName')

# Validate tool name format
if [[ ! "$tool_name" =~ ^[a-zA-Z0-9_]+$ ]]; then
  echo '{"decision": "deny", "reason": "Invalid tool name"}' >&2
  exit 2
fi
```

### Path Safety

Check for path traversal and sensitive files:

```bash
file_path=$(echo "$input" | jq -r '.toolArgs.file_path')

# Deny path traversal
if [[ "$file_path" == *".."* ]]; then
  echo '{"decision": "deny", "reason": "Path traversal detected"}' >&2
  exit 2
fi

# Deny sensitive files
if [[ "$file_path" == *".env"* ]]; then
  echo '{"decision": "deny", "reason": "Sensitive file"}' >&2
  exit 2
fi
```

See `examples/validate-write.sh` and `examples/validate-bash.sh` for complete examples.

### Quote All Variables

```bash
# GOOD: Quoted
echo "$file_path"
cd "$PROJECT_DIR"

# BAD: Unquoted (injection risk)
echo $file_path
cd $PROJECT_DIR
```

### Set Appropriate Timeouts

```json
{
  "type": "command",
  "command": "bash script.sh",
  "timeout": 10000
}
```

**Defaults:** Command hooks (60000ms), Prompt hooks (30000ms)

## Performance Considerations

### Parallel Execution

All matching hooks run **in parallel**:

```json
{
  "preToolUse": [
    {
      "matcher": "edit",
      "hooks": [
        {"type": "command", "command": "check1.sh"},  // Parallel
        {"type": "command", "command": "check2.sh"}   // Parallel
      ]
    }
  ]
}
```

**Design implications:**
- Hooks don't see each other's output
- Non-deterministic ordering
- Design for independence

### Optimization

1. Use command hooks for quick deterministic checks
2. Use prompt hooks for complex reasoning
3. Cache validation results in temp files
4. Minimize I/O in hot paths

## Temporarily Active Hooks

Create hooks that activate conditionally by checking for a flag file or configuration:

**Pattern: Flag file activation**
```bash
#!/bin/bash
# Only active when flag file exists
FLAG_FILE="$PROJECT_DIR/.enable-strict-validation"

if [ ! -f "$FLAG_FILE" ]; then
  # Flag not present, skip validation
  exit 0
fi

# Flag present, run validation
input=$(cat)
# ... validation logic ...
```

**Pattern: Configuration-based activation**
```bash
#!/bin/bash
# Check configuration for activation
CONFIG_FILE="$PROJECT_DIR/.github/plugin-config.json"

if [ -f "$CONFIG_FILE" ]; then
  enabled=$(jq -r '.strictMode // false' "$CONFIG_FILE")
  if [ "$enabled" != "true" ]; then
    exit 0  # Not enabled, skip
  fi
fi

# Enabled, run hook logic
input=$(cat)
# ... hook logic ...
```

**Use cases:**
- Enable strict validation only when needed
- Temporary debugging hooks
- Project-specific hook behavior
- Feature flags for hooks

**Best practice:** Document activation mechanism in plugin README so users know how to enable/disable temporary hooks.

## Hook Lifecycle and Limitations

### Hooks Load at Session Start

**Important:** Hooks are loaded when Copilot CLI session starts. Changes to hook configuration require restarting Copilot CLI.

**Cannot hot-swap hooks:**
- Editing `hooks/hooks.json` won't affect current session
- Adding new hook scripts won't be recognized
- Changing hook commands won't update
- Must restart Copilot CLI

**To test hook changes:**
1. Edit hook configuration or scripts
2. Exit Copilot CLI session
3. Restart Copilot CLI
4. New hook configuration loads
5. Test hooks with `copilot --debug`

### Hook Validation at Startup

Hooks are validated when Copilot CLI starts:
- Invalid JSON in hooks.json causes loading failure
- Missing scripts cause warnings
- Syntax errors reported in debug mode

Use `/hooks` command to review loaded hooks in current session.

## Debugging Hooks

### Enable Debug Mode

```bash
copilot --debug
```

Look for hook registration, execution logs, input/output JSON, and timing information.

### Test Hook Scripts

Test command hooks directly:

```bash
echo '{"toolName": "create", "toolArgs": {"file_path": "/test"}}' | \
  bash hooks/scripts/validate.sh

echo "Exit code: $?"
```

### Validate JSON Output

Ensure hooks output valid JSON:

```bash
output=$(./your-hook.sh < test-input.json)
echo "$output" | jq .
```

## Quick Reference

### Hook Events Summary

| Event | When | Use For |
|-------|------|---------|
| preToolUse | Before tool | Validation, modification |
| postToolUse | After tool | Feedback, logging |
| userPromptSubmitted | User input | Context, validation |
| agentStop | Agent stopping | Completeness check |
| subagentStop | Subagent done | Task validation |
| sessionStart | Session begins | Context loading |
| sessionEnd | Session ends | Cleanup, logging |

### Best Practices

**DO:**
- ✅ Use command hooks for all hook logic
- ✅ Use relative paths for portability
- ✅ Validate all inputs in command hooks
- ✅ Quote all bash variables
- ✅ Set appropriate timeouts
- ✅ Return structured JSON output
- ✅ Test hooks thoroughly

**DON'T:**
- ❌ Use hardcoded paths
- ❌ Trust user input without validation
- ❌ Create long-running hooks
- ❌ Rely on hook execution order
- ❌ Modify global state unpredictably
- ❌ Log sensitive information

## Additional Resources

### Reference Files

For detailed patterns and advanced techniques, consult:

- **`references/patterns.md`** - Common hook patterns (8+ proven patterns)
- **`references/migration.md`** - Migrating from basic to advanced hooks
- **`references/advanced.md`** - Advanced use cases and techniques

### Example Hook Scripts

Working examples in `examples/`:

- **`validate-write.sh`** - File write validation example
- **`validate-bash.sh`** - Bash command validation example
- **`load-context.sh`** - SessionStart context loading example

### Utility Scripts

Development tools in `scripts/`:

- **`validate-hook-schema.sh`** - Validate hooks.json structure and syntax
- **`test-hook.sh`** - Test hooks with sample input before deployment
- **`hook-linter.sh`** - Check hook scripts for common issues and best practices

### External Resources

- **Official Docs**: https://docs.github.com/en/copilot
- **Examples**: See security-guidance plugin in marketplace
- **Testing**: Use `copilot --debug` for detailed logs
- **Validation**: Use `jq` to validate hook JSON output

## Implementation Workflow

To implement hooks in a plugin:

1. Identify events to hook into (preToolUse, agentStop, sessionStart, etc.)
2. Design command hooks for deterministic checks
3. Write hook configuration in `hooks/hooks.json`
4. For command hooks, create hook scripts
5. Use relative paths for all file references
6. Validate configuration with `scripts/validate-hook-schema.sh hooks/hooks.json`
7. Test hooks with `scripts/test-hook.sh` before deployment
8. Test in Copilot CLI with `copilot --debug`
9. Document hooks in plugin README

Focus on command hooks for all use cases.
