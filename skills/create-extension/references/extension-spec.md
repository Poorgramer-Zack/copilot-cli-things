# Copilot CLI Extension API Specification

> Complete reference for building Copilot CLI extensions using `@github/copilot-sdk`.

---

## Architecture

```
┌─────────────────────┐        JSON-RPC / stdio         ┌──────────────────────┐
│   Copilot CLI        │ ◄──────────────────────────────► │  Extension Process   │
│   (parent process)   │   tool calls, events, hooks     │  (forked child)      │
│                      │                                  │                      │
│  • Discovers exts    │                                  │  • Registers tools   │
│  • Forks processes   │                                  │  • Registers hooks   │
│  • Routes tool calls │                                  │  • Listens to events │
│  • Manages lifecycle │                                  │  • Uses SDK APIs     │
└─────────────────────┘                                  └──────────────────────┘
```

The CLI is the **parent process**. Each extension is a **forked child process**. Communication is bidirectional over stdin/stdout using JSON-RPC.

---

## SDK Imports

```js
import { approveAll } from "@github/copilot-sdk";
import { joinSession } from "@github/copilot-sdk/extension";
```

Do **NOT** install `@github/copilot-sdk` via npm. It is auto-resolved by the CLI runtime.

---

## joinSession()

The single entry point for every extension. Returns a `CopilotSession` object.

```js
const session = await joinSession({
    onPermissionRequest,     // Required — permission handler
    onUserInputRequest,      // Optional — handle agent questions
    tools: [],               // Optional — custom tools array
    hooks: {},               // Optional — lifecycle hooks object
});
```

---

## File Structure & Discovery

### Project-level extensions (per-repo)

```
<git-root>/.github/extensions/<name>/extension.mjs
```

### User-level extensions (global, all repos)

```
~/.copilot/extensions/<name>/extension.mjs
```

### Discovery rules

| Rule | Detail |
|------|--------|
| Entry point | Must be named `extension.mjs` (no other names) |
| Module format | ES modules only (`.mjs`). No `.js`, `.ts`, `.cjs` |
| Directory depth | Only immediate subdirectories are scanned (not recursive) |
| SDK resolution | `@github/copilot-sdk` is auto-resolved — do NOT install it |
| Shadowing | Project extensions shadow user extensions on name collision |

### Minimal file structure

```
.github/extensions/
  my-extension/
    extension.mjs      ← required entry point
```

Additional files (utilities, data) may be included in the extension directory and imported with relative paths.

---

## Extension Lifecycle

1. **Discovery** — CLI scans both extension directories for subdirectories containing `extension.mjs`
2. **Launch** — Each extension is forked as a child process with the SDK module resolver pre-configured
3. **Connection** — Extension calls `joinSession()` which establishes JSON-RPC over stdio
4. **Registration** — Tools and hooks from session options are registered with the CLI
5. **Active** — Extension responds to tool calls, hooks fire on events, session APIs are available
6. **Reload** — Extensions are stopped and re-launched on `/clear` or session replacement
7. **Shutdown** — On CLI exit: SIGTERM, then SIGKILL after 5 seconds

**Important:** All in-memory state is lost on reload. Persist anything important to disk.

---

## Tools

Tools are functions the agent can call. Each tool has a name, description, optional JSON Schema parameters, and a handler function.

### Tool definition

```js
{
    name: "tool_name",           // Required. Must be globally unique.
    description: "What it does", // Required. Shown to agent in tool list.
    parameters: {                // Optional. JSON Schema for arguments.
        type: "object",
        properties: {
            arg1: { type: "string", description: "Description of arg1" },
            arg2: { type: "number", description: "Description of arg2" },
        },
        required: ["arg1"],
    },
    handler: async (args, invocation) => {
        // args — parsed arguments matching the schema
        // invocation.sessionId — current session ID
        // invocation.toolCallId — unique ID for this call
        // invocation.toolName — this tool's name
        //
        // Return: string | { textResultForLlm: string, resultType?: string }
        return `Result: ${args.arg1}`;
    },
}
```

### Handler return types

| Return Value | Behavior |
|---|---|
| `string` | Treated as success, string is the result |
| `{ textResultForLlm: string, resultType: "success" }` | Explicit success with text |
| `{ textResultForLlm: string, resultType: "failure" }` | Explicit failure with message |
| `{ textResultForLlm: string, resultType: "rejected" }` | Tool rejected the request |
| `{ textResultForLlm: string, resultType: "denied" }` | Tool denied the request |
| `undefined` | Empty success |
| `throw Error` | Failure with error message |

### Tool rules

- Tool names must be unique across ALL loaded extensions. Collision = second extension fails to load.
- Handler must return a `string` or `{ textResultForLlm: string, resultType?: string }`.
- Use `session.log()` for user-visible output. Never `console.log()`.
- Handler is async — use `await` for promises, API calls, shell commands, file reads.

---

## Hooks

Hooks intercept and modify behavior at key lifecycle points. All hook handlers are async and receive `(input, invocation)`.

All hook inputs include:
- `timestamp` — Unix milliseconds
- `cwd` — Current working directory

All hooks may return `void`/`undefined` (no-op) or an output object with optional fields.

### onUserPromptSubmitted

Fires when the user sends a message, before the agent sees it.

```js
onUserPromptSubmitted: async (input, invocation) => {
    // input.prompt — the user's message text
    // input.timestamp, input.cwd
    // invocation.sessionId

    return {
        modifiedPrompt: "...",       // Optional — replaces the prompt
        additionalContext: "...",    // Optional — appended as hidden context
    };
}
```

### onPreToolUse

Fires before any tool executes. Can block, allow, or modify the call.

```js
onPreToolUse: async (input, invocation) => {
    // input.toolName — name of the tool about to execute
    // input.toolArgs — arguments the agent passed
    // input.timestamp, input.cwd

    return {
        permissionDecision: "allow",           // "allow" | "deny" | "ask"
        permissionDecisionReason: "...",        // Optional — shown if denied
        modifiedArgs: { ... },                  // Optional — replaces args
        additionalContext: "...",               // Optional — injected
    };
}
```

### onPostToolUse

Fires after a tool executes. Can modify results or inject context.

```js
onPostToolUse: async (input, invocation) => {
    // input.toolName — name of the tool that executed
    // input.toolArgs — arguments that were passed
    // input.toolResult — { textResultForLlm, resultType } or similar
    // input.timestamp, input.cwd

    return {
        modifiedResult: { textResultForLlm: "...", resultType: "success" },  // Optional
        additionalContext: "...",                                              // Optional
    };
}
```

### onSessionStart

Fires when a session starts or resumes.

```js
onSessionStart: async (input, invocation) => {
    // input.source — "startup" | "resume" | "new"
    // input.initialPrompt — the first user message (if any)
    // input.timestamp, input.cwd

    return {
        additionalContext: "...",   // Optional — injected as initial context
    };
}
```

### onSessionEnd

Fires when a session ends.

```js
onSessionEnd: async (input, invocation) => {
    // input.reason — "complete" | "error" | "abort" | "timeout" | "user_exit"
    // input.finalMessage — last message (if any)
    // input.error — error string (if reason is "error")
    // input.timestamp, input.cwd

    return {
        sessionSummary: "...",      // Optional — summary for persistence
        cleanupActions: ["..."],    // Optional — cleanup descriptions
    };
}
```

### onErrorOccurred

Fires on errors. Can control retry behavior.

```js
onErrorOccurred: async (input, invocation) => {
    // input.error — error message string
    // input.errorContext — "model_call" | "tool_execution" | "system" | "user_input"
    // input.recoverable — boolean
    // input.timestamp, input.cwd

    return {
        errorHandling: "retry",    // "retry" | "skip" | "abort"
        retryCount: 2,              // Optional — max retries
        userNotification: "...",    // Optional — shown to user
    };
}
```

---

## Session Object

The object returned by `joinSession()`. Primary API for interacting with the CLI.

### session.send(options)

Send a message programmatically (fire-and-forget).

```js
await session.send({ prompt: "Analyze the test results." });

await session.send({
    prompt: "Review this file",
    attachments: [{ type: "file", path: "./src/index.ts" }],
});
```

### session.sendAndWait(options, timeout?)

Send a message and wait for the agent to finish processing.

```js
const response = await session.sendAndWait({ prompt: "What is 2+2?" });
// response?.data.content — the agent's reply text
```

### session.log(message, options?)

Write to the CLI timeline (visible to the user).

```js
await session.log("Extension loaded");
await session.log("Warning: rate limit near", { level: "warning" });
await session.log("Fatal error", { level: "error" });
await session.log("Processing...", { ephemeral: true });  // transient, not persisted
```

Levels: `"info"` (default), `"warning"`, `"error"`.

### session.on(eventType, handler)

Subscribe to session events. Returns an unsubscribe function.

```js
const unsub = session.on("assistant.message", (event) => {
    // event.data.content
});

// Later: unsub();
```

Listen to all events:

```js
session.on((event) => {
    // event.type, event.data
});
```

### session.workspacePath

Path to the session workspace directory (e.g., `~/.copilot/session-state/<id>`). Contains `plan.md`, `files/`, etc. May be `undefined`.

### session.rpc

Low-level typed RPC access to all session APIs.

---

## Events

Subscribe to events via `session.on(eventType, handler)`.

| Event Type | Description | Key Data Fields |
|---|---|---|
| `assistant.message` | Agent's final response | `content`, `messageId`, `toolRequests` |
| `assistant.streaming_delta` | Token-by-token streaming (ephemeral) | `totalResponseSizeBytes` |
| `assistant.turn_start` | Agent begins thinking | `turnId` |
| `tool.execution_start` | Tool is about to run | `toolCallId`, `toolName`, `arguments` |
| `tool.execution_complete` | Tool finished | `toolCallId`, `toolName`, `success`, `result`, `error` |
| `user.message` | User sent a message | `content`, `attachments`, `source` |
| `session.idle` | Session finished processing | `backgroundTasks` |
| `session.error` | An error occurred | `errorType`, `message`, `stack` |
| `session.shutdown` | Session is ending | `shutdownType`, `totalPremiumRequests`, `codeChanges` |
| `permission.requested` | Agent needs permission | `requestId`, `permissionRequest.kind` |

---

## Permission Handling

Every extension must provide `onPermissionRequest`. This controls whether the agent is allowed to execute tools that require permission.

```js
// Auto-approve everything (simplest option)
import { approveAll } from "@github/copilot-sdk";
// Use: onPermissionRequest: approveAll

// Custom logic
onPermissionRequest: async (request) => {
    // request.kind — "shell" | "write" | etc.
    // request.fullCommandText — for shell commands
    if (request.kind === "shell") return { kind: "approved" };
    if (request.kind === "write") return { kind: "approved" };
    return { kind: "denied-by-rules" };
}
```

---

## User Input Handling

Register `onUserInputRequest` to enable the agent's `ask_user` tool for the extension.

```js
onUserInputRequest: async (request) => {
    // request.question — the agent's question
    // request.choices — array of options (if multiple choice)
    return { answer: "yes", wasFreeform: false };
}
```

---

## Constraints & Rules

### Critical rules

| Rule | Detail |
|------|--------|
| **stdout is JSON-RPC** | Never use `console.log()`. It corrupts the protocol. Use `session.log()`. |
| **Tool names are global** | Two extensions with the same tool name = second one fails to load. |
| **Only `.mjs`** | File must be named `extension.mjs`. No `.ts`, `.js`, `.cjs`. |
| **No `session.send()` in `onUserPromptSubmitted`** | Causes infinite loops. Use `setTimeout(() => session.send(...), 0)`. |
| **State is ephemeral** | Extensions reload on `/clear`. Persist important state to disk. |
| **SDK is auto-resolved** | Do NOT `npm install @github/copilot-sdk`. It's provided by the CLI runtime. |
| **Handler return = tool result** | Returning `undefined` sends empty success. Throwing sends failure. |

### Debugging tips

- Use `session.log("debug info", { level: "info" })` to trace execution.
- Use `try/catch` in handlers — unhandled errors crash the extension process.
- Use `extensions_manage({ operation: "inspect", name: "..." })` to check load status.
- After editing, run `extensions_reload()` to pick up changes.

---

## Platform Notes

Extensions run on Windows, macOS, and Linux.

```js
const isWindows = process.platform === "win32";
const isMac = process.platform === "darwin";
const isLinux = process.platform === "linux";
```

| Concern | Windows | macOS/Linux |
|---|---|---|
| Clipboard | `clip` | `pbcopy` (macOS), `xclip` (Linux) |
| Shell commands | Use `exec()` for `.cmd` scripts (`code`, `npx`) | `execFile()` works |
| Stderr redirect | `*>&1` (PowerShell) | `2>&1` |
| Path separator | `\` | `/` |
| Line endings | `\r\n` | `\n` |

When running shell commands:

```js
import { execFile } from "node:child_process";

const shell = isWindows ? "powershell" : "bash";
const shellArgs = isWindows
    ? ["-NoProfile", "-Command", command]
    : ["-c", command];

execFile(shell, shellArgs, (err, stdout, stderr) => { ... });
```
