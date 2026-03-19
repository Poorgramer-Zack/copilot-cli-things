# Cron Task Extension

Schedule recurring tasks within your Copilot CLI session — periodic shell commands, automated checks, or agent prompts on a timer.

## Use Cases

- **Automated checks**: Run lint/test/build periodically to catch issues early
- **Background monitoring**: Periodic `git status`, CI status, or server health checks
- **Reminders**: Send prompts to the agent on a schedule (e.g., "commit your work")
- **Maintenance**: Auto-pull from upstream every N minutes

## Installation

Copy this directory to either location:

```
# Project-level
.github/extensions/cron-task/extension.mjs

# User-level (all projects)
~/.copilot/extensions/cron-task/extension.mjs
```

## Tools

### `schedule_task`

Schedule a new recurring task.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | ✅ | Human-readable task name |
| `type` | `"command"` \| `"prompt"` | ✅ | Shell command or agent prompt |
| `command` | string | ✅ | The command/prompt text to execute |
| `interval` | string | ✅ | Frequency: `"30s"`, `"5m"`, `"1h"` |
| `persist` | boolean | ❌ | Save for future sessions (default: false) |

**Minimum interval**: 10 seconds.

### `remove_task`

Stop and remove a task by ID or name.

### `list_tasks`

Show all active tasks with status, run count, and last execution time.

### `pause_task` / `resume_task`

Temporarily pause or resume a task without removing it.

## Task Types

### Command Tasks

Execute a shell command and log the output:

> "Run `npm run lint` every 5 minutes"

The extension runs the command in a subprocess, logs ✅/❌ status and output (truncated to 500 chars) to the CLI timeline.

### Prompt Tasks

Send a message to the agent on a schedule:

> "Every 30 minutes, remind me to commit my work"

The extension calls `session.send()` to inject a prompt into the conversation.

## Persistence

Tasks created with `persist: true` are saved to `~/.copilot/cron-tasks.json` and auto-restored on the next session start.

Session-only tasks (default) are discarded when the session ends.

## Examples

```
"Schedule a lint check every 5 minutes"
→ schedule_task(name: "lint", type: "command", command: "npm run lint", interval: "5m")

"Every 10 minutes, check git status"
→ schedule_task(name: "git-status", type: "command", command: "git status --short", interval: "10m")

"Remind me to commit every 30 minutes"
→ schedule_task(name: "commit-reminder", type: "prompt", command: "Reminder: consider committing your current work", interval: "30m")

"Stop the lint check"
→ remove_task(task: "lint")

"What tasks are running?"
→ list_tasks()
```

## Lifecycle

- Tasks are started on session start (persisted) or when explicitly scheduled
- All timers are cleaned up on session shutdown
- Extension reloads on `/clear` — non-persisted tasks are lost
- Command tasks have a 30-second timeout per execution

## Architecture

```
┌─────────────────┐         setInterval          ┌──────────────────┐
│  Copilot CLI     │ ◄──── tool results ──────── │  cron-task ext   │
│                  │                              │                  │
│  • Calls tools   │ ────► schedule_task ───────► │  • Manages timers│
│  • Shows logs    │       remove_task            │  • Runs commands │
│                  │       list_tasks             │  • Sends prompts │
│                  │       pause/resume           │  • Persists config│
└─────────────────┘                              └──────────────────┘
```
