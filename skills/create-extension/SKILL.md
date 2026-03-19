---
name: Create Extension
description: This skill should be used when the user asks to "create an extension", "build an extension", "add a Copilot CLI extension", "write an extension.mjs", "make a custom tool", "add hooks via extension", or needs guidance on Copilot CLI extension development, lifecycle, SDK API, tools, hooks, or events.
version: 0.1.0
---

# Create Copilot CLI Extension

## Prerequisites

Extensions require **experimental mode**. Before creating or testing an extension, ensure it is active:

- **Launch flag:** `copilot --experimental`
- **Slash command (persistent):** `/experimental` inside a running session

Without experimental mode, extensions will not be discovered or loaded.

## What is an Extension

An extension is a JavaScript (`.mjs`) child process that communicates with the Copilot CLI via **JSON-RPC over stdio**. Extensions can register custom tools, intercept lifecycle events via hooks, and subscribe to real-time session events.

Extensions **can**: register tools the agent calls, intercept/modify prompts and tool calls, inject hidden context, send messages programmatically, subscribe to events, control error handling.

Extensions **cannot**: render interactive UI, use `console.log()`, share tool names with other extensions, use TypeScript directly.

## File Location

**Project-level** (per-repo):

```
<git-root>/.github/extensions/<name>/extension.mjs
```

**User-level** (global, all repos):

```
~/.copilot/extensions/<name>/extension.mjs
```

The file **must** be named `extension.mjs`. Only immediate subdirectories are scanned. Project extensions shadow user extensions on name collision.

## Extension Lifecycle

1. **Discovery** — CLI scans extension directories for subdirectories containing `extension.mjs`
2. **Launch** — Each extension is forked as a child process with the SDK module resolver pre-configured
3. **Connection** — Extension calls `joinSession()` to establish JSON-RPC over stdio
4. **Registration** — Tools and hooks from session options are registered with the CLI
5. **Active** — Extension responds to tool calls, hooks fire on events, session APIs are available
6. **Reload** — Extensions are stopped and re-launched on `/clear`, `extensions_reload()`, or session replacement
7. **Shutdown** — On CLI exit: SIGTERM, then SIGKILL after 5 seconds

All in-memory state is lost on reload. Persist important data to disk.

## Core Concepts

### Tools

Custom functions the agent can call. Each tool requires:

- `name` — Globally unique identifier (snake_case recommended)
- `description` — What it does (agent reads this to decide when to call it)
- `parameters` — JSON Schema for arguments (optional)
- `handler` — Async function returning `string`, `{ textResultForLlm, resultType }`, or `undefined`

Result types: `"success"`, `"failure"`, `"rejected"`, `"denied"`. Throwing an error sends failure.

### Hooks

Lifecycle interceptors. All receive `(input, invocation)` where `input` includes `timestamp` and `cwd`.

| Hook | When | Can Return |
|------|------|------------|
| `onUserPromptSubmitted` | User sends message | `modifiedPrompt`, `additionalContext` |
| `onPreToolUse` | Before tool executes | `permissionDecision`, `modifiedArgs`, `additionalContext` |
| `onPostToolUse` | After tool executes | `modifiedResult`, `additionalContext` |
| `onSessionStart` | Session starts/resumes | `additionalContext` |
| `onSessionEnd` | Session ends | `sessionSummary`, `cleanupActions` |
| `onErrorOccurred` | Error occurs | `errorHandling`, `retryCount`, `userNotification` |

### Events

Subscribe via `session.on(eventType, handler)`. Returns an unsubscribe function.

| Event | Key Data Fields |
|-------|----------------|
| `assistant.message` | `content`, `messageId` |
| `tool.execution_start` | `toolCallId`, `toolName`, `arguments` |
| `tool.execution_complete` | `toolCallId`, `toolName`, `success`, `result`, `error` |
| `user.message` | `content`, `attachments`, `source` |
| `session.idle` | `backgroundTasks` |
| `session.shutdown` | `shutdownType`, `totalPremiumRequests` |

### Session Object

Returned by `joinSession()`:

- `session.send({ prompt, attachments? })` — Fire-and-forget message to agent
- `session.sendAndWait({ prompt }, timeout?)` — Send and wait for agent reply
- `session.log(message, { level?, ephemeral? }?)` — Write to CLI timeline
- `session.on(eventType, handler)` — Subscribe to events
- `session.workspacePath` — Session workspace directory path

### Permission Handling

Every extension must provide `onPermissionRequest`. Use `approveAll` from the SDK for simple cases, or implement custom logic:

```js
import { approveAll } from "@github/copilot-sdk";
// onPermissionRequest: approveAll
```

## Critical Rules

1. **File MUST be `extension.mjs`** — No `.js`, `.ts`, `.cjs`
2. **Never use `console.log()`** — stdout is JSON-RPC transport; use `session.log()`
3. **Tool names must be globally unique** — Collision causes the second extension to fail
4. **Don't install `@github/copilot-sdk`** — Auto-provided by the CLI runtime
5. **Always wrap handlers in try/catch** — Unhandled errors crash the extension process
6. **No `session.send()` inside `onUserPromptSubmitted`** — Causes infinite loops; use `setTimeout(() => session.send(...), 0)`
7. **Use ES module syntax** — `import`/`export`, not `require()`/`module.exports`

## Creation Workflow

### Step 1: Determine Extension Location

Ask the user or infer from context:
- **Project-level**: `.github/extensions/<name>/` — For repo-specific tools
- **User-level**: `~/.copilot/extensions/<name>/` — For personal/global tools

### Step 2: Create Directory and File

Create the extension directory and copy the template:

```
<location>/<name>/extension.mjs
```

Use the template from `examples/extension-template.mjs` as the starting point. The template includes all tool, hook, and event patterns commented out.

Alternatively, run the scaffold script:

```bash
bash scripts/scaffold-extension.sh <extension-name>
```

### Step 3: Implement Required Functionality

Based on the user's requirements:
- **Uncomment and fill in** the relevant tool, hook, or event sections
- **Delete** sections that are not needed
- **Add imports** for any Node.js built-in modules (e.g., `child_process`, `fs`)

### Step 4: Reload Extensions

```
extensions_reload()
```

### Step 5: Verify

```
extensions_manage({ operation: "inspect", name: "<name>" })
```

If the extension shows as "failed", check for:
- Syntax errors in the `.mjs` file
- Tool name collisions with other extensions
- Missing `onPermissionRequest` handler
- Use of `console.log()` (breaks JSON-RPC)

## Platform Notes

Handle platform differences when running shell commands:

```js
const isWindows = process.platform === "win32";
const shell = isWindows ? "powershell" : "bash";
const shellArgs = isWindows
    ? ["-NoProfile", "-Command", command]
    : ["-c", command];
```

| Concern | Windows | macOS/Linux |
|---------|---------|-------------|
| Clipboard | `clip` | `pbcopy` / `xclip` |
| Shell | PowerShell | bash |
| Path separator | `\` | `/` |

## Quick Reference

- **Full API spec**: `references/extension-spec.md`
- **Patterns and recipes**: `references/patterns-and-recipes.md`
- **Template file**: `examples/extension-template.mjs`
- **Scaffold script**: `scripts/scaffold-extension.sh`
