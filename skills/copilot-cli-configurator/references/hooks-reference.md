# Hooks Configuration Reference

Full reference for hook configuration in GitHub Copilot CLI.

## Configuration File

Hooks are defined in JSON files located at `.github/hooks/` in your repository. For CLI, hooks are loaded from the current working directory.

### Schema

```json
{
  "version": 1,
  "hooks": {
    "sessionStart": [ ...hook entries ],
    "sessionEnd": [ ...hook entries ],
    "userPromptSubmitted": [ ...hook entries ],
    "preToolUse": [ ...hook entries ],
    "postToolUse": [ ...hook entries ],
    "errorOccurred": [ ...hook entries ],
    "agentStop": [ ...hook entries ],
    "subagentStop": [ ...hook entries ]
  }
}
```

### Hook Entry Schema

```json
{
  "type": "command",
  "bash": "shell command for Unix",
  "powershell": "command for Windows",
  "cwd": ".",
  "timeoutSec": 30,
  "env": {
    "KEY": "VALUE"
  }
}
```

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `type` | string | Yes | — | Always `"command"` |
| `bash` | string | Yes* | — | Shell command for Unix systems |
| `powershell` | string | No | — | Shell command for Windows (provide both for cross-platform) |
| `cwd` | string | No | `.` | Working directory for the command |
| `timeoutSec` | number | No | `30` | Maximum execution time in seconds |
| `env` | object | No | `{}` | Environment variables as key-value pairs |

*At least `bash` or `powershell` must be provided.

## Hook Triggers

### sessionStart
Runs when a CLI session begins. Use for:
- Logging session start times
- Setting up temporary directories
- Initializing session-specific resources

### sessionEnd
Runs when a CLI session ends. Use for:
- Cleanup of temporary resources
- Archiving session transcripts
- Final logging

### userPromptSubmitted
Runs when the user submits a prompt. Receives input data including the prompt content. Use for:
- Prompt logging
- Content filtering
- Audit trail

### preToolUse
Runs before a tool executes. Receives input with `toolName` and `toolArgs`. Use for:
- Blocking specific commands
- Validating tool arguments
- Policy enforcement (e.g., prevent edits to protected paths)

### postToolUse
Runs after a tool completes. Receives output data from the tool. Use for:
- Output validation
- Post-action logging
- Triggering follow-up actions

### errorOccurred
Runs when an error occurs. Use for:
- Error logging
- Custom retry logic
- Alert notifications

### agentStop
Runs when the main agent stops without an error. Use for:
- Session summary generation
- Final validation checks

### subagentStop
Runs when a subagent completes its work. Use for:
- Validating subagent output before passing to main agent
- Logging subagent results

## Input Data

Hook scripts receive JSON input via stdin with context about the triggering event:

```json
{
  "timestamp": 1704614400000,
  "cwd": "/path/to/project",
  "toolName": "bash",
  "toolArgs": "{\"command\":\"ls\"}"
}
```

## Examples

### Log All Prompts

```json
{
  "version": 1,
  "hooks": {
    "userPromptSubmitted": [
      {
        "type": "command",
        "bash": "./scripts/log-prompt.sh",
        "powershell": "./scripts/log-prompt.ps1",
        "cwd": "scripts",
        "env": {
          "LOG_LEVEL": "INFO"
        }
      }
    ]
  }
}
```

### Block Edits to Protected Paths

```json
{
  "version": 1,
  "hooks": {
    "preToolUse": [
      {
        "type": "command",
        "bash": "./scripts/check-protected-paths.sh",
        "cwd": ".",
        "timeoutSec": 5
      }
    ]
  }
}
```

### Session Lifecycle Logging

```json
{
  "version": 1,
  "hooks": {
    "sessionStart": [
      {
        "type": "command",
        "bash": "echo \"Session started: $(date)\" >> logs/session.log",
        "powershell": "Add-Content -Path logs/session.log -Value \"Session started: $(Get-Date)\"",
        "timeoutSec": 10
      }
    ],
    "sessionEnd": [
      {
        "type": "command",
        "bash": "echo \"Session ended: $(date)\" >> logs/session.log",
        "powershell": "Add-Content -Path logs/session.log -Value \"Session ended: $(Get-Date)\"",
        "timeoutSec": 10
      }
    ]
  }
}
```

## Debugging

Enable bash debug mode in hook scripts:

```bash
#!/bin/bash
set -x
INPUT=$(cat)
echo "DEBUG: Received input" >&2
echo "$INPUT" >&2
```

Test hooks locally:

```bash
echo '{"timestamp":1704614400000,"cwd":"/tmp","toolName":"bash","toolArgs":"{\"command\":\"ls\"}"}' | ./my-hook.sh
echo $?
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Hooks not executing | Verify JSON is in `.github/hooks/`, check valid JSON syntax, ensure `version: 1` |
| Hooks timing out | Increase `timeoutSec`, optimize script |
| Invalid JSON output | Use `jq -c` (Unix) or `ConvertTo-Json -Compress` (PowerShell) |
| Script not running | Check `chmod +x` and shebang line (`#!/bin/bash`) |
