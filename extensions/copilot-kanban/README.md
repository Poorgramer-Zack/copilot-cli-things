# Copilot Kanban Extension

A real-time session and fleet monitoring dashboard for GitHub Copilot CLI. Passively tracks all session activity — subagents, tool executions, messages, model changes, and errors — with both CLI text output and a **web-based dashboard UI**.

Inspired by [vibe-kanban](https://github.com/BloopAI/vibe-kanban).

## Features

- 🌐 **Web Dashboard** — real-time kanban board in your browser (dark theme, SSE live updates)
- 📋 **CLI Kanban** — text-based kanban board for in-terminal use
- 📊 **Session Dashboard** — comprehensive session statistics
- 🔧 Tool usage tracking with per-tool success/failure counts and visual bars
- 💬 Message and turn counting
- 🧠 Model change history
- ❌ Error tracking with timestamps
- Zero configuration — works out of the box

## Installation

Copy the directory to either:

```
# Project-level
.github/extensions/copilot-kanban/
  extension.mjs
  dashboard.html

# User-level (all projects)
~/.copilot/extensions/copilot-kanban/
  extension.mjs
  dashboard.html
```

## Tools

### `show_kanban`

Displays a text-based kanban board in the CLI with agents organized by status columns (Running, Done, Failed) and a session summary line.

### `session_dashboard`

Shows comprehensive session statistics: duration, messages, tool usage breakdown, model changes, agent summary, and error log.

### `open_kanban`

Opens the web dashboard in your default browser. The dashboard auto-updates in real time via Server-Sent Events (SSE).

## Web Dashboard

On session start, the extension launches an HTTP server at `http://127.0.0.1:19741` (auto-increments if port is busy).

The dashboard features:

- **Stats bar** — duration, model, messages, tools, agents, errors at a glance
- **Kanban columns** — Running / Done / Failed with animated agent cards
- **Tool panel** — per-tool usage with visual progress bars
- **Model timeline** — history of model switches
- **Error log** — timestamped errors with type and message
- **Auto-reconnect** — reconnects automatically if connection drops
- **Live duration** — running agents show real-time elapsed time

## Usage Examples

```
"Show me the kanban board"       → show_kanban()
"Open the dashboard"             → open_kanban()
"How's the session going?"       → session_dashboard()
"What agents are running?"       → show_kanban()
```

## How It Works

```
┌─────────────────┐    events     ┌──────────────────────┐     SSE      ┌──────────┐
│  Copilot CLI     │ ──────────►  │  copilot-kanban ext  │ ──────────►  │ Browser  │
│                  │              │                      │              │          │
│  subagent.*      │              │  In-memory state     │  GET /       │ Kanban   │
│  tool.*          │              │  HTTP server         │  /api/state  │ Board    │
│  user/assistant  │              │  SSE broadcast       │  /api/events │ Stats    │
│  model_change    │              │                      │              │ Tools    │
│  error           │              │  Tools:              │              │ Errors   │
│                  │ ◄── tools ── │  show_kanban         │              │          │
│                  │              │  session_dashboard   │              │          │
│                  │              │  open_kanban         │              │          │
└─────────────────┘              └──────────────────────┘              └──────────┘
```

### Events Tracked

| Event | What's Tracked |
|-------|---------------|
| `subagent.started` | New agent → Running column |
| `subagent.completed` | Agent → Done column |
| `subagent.failed` | Agent → Failed column |
| `tool.execution_start/complete` | Tool usage stats (count, success, failure) |
| `user.message` / `assistant.message` | Message and turn counts |
| `session.model_change` | Model switch history |
| `session.error` | Error log with type and message |

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Dashboard HTML page |
| `GET /api/state` | JSON snapshot of current state |
| `GET /api/events` | SSE stream (real-time updates) |

## Limitations

- Fleet mode status cannot be passively monitored (SDK limitation — no fleet events available)
- Subagent event data shapes are partially documented; defensive coding is used
- Data is session-scoped — lost on `/clear` or CLI exit
- Extension is read-only — observes but never modifies session behavior
