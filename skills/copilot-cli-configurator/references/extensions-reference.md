# Extensions Reference

Complete SDK type signatures, event types, and configuration details for Copilot CLI extensions.

## Discovery & Lifecycle

### Discovery Locations

| Priority | Location | Scope |
|----------|----------|-------|
| 1 (highest) | `.github/extensions/<name>/extension.mjs` | Project |
| 2 | `~/.copilot/extensions/<name>/extension.mjs` | User (all projects) |

- Only immediate subdirectories are checked (not recursive)
- Project extensions shadow user extensions on name collision
- Each subdirectory must contain a file named `extension.mjs`

### Lifecycle Events

| Event | Trigger |
|-------|---------|
| Discovery | CLI startup, `extensions_reload()` |
| Launch | Forked as child process with SDK auto-resolved |
| Connection | `joinSession()` establishes JSON-RPC over stdio |
| Reload | `/clear` command or `extensions_reload()` — all state lost |
| Shutdown | CLI exit — SIGTERM, then SIGKILL after 5 seconds |

---

## Tool Registration

### Schema

```typescript
interface Tool {
    name: string;           // Globally unique across all extensions
    description: string;    // Agent reads this to decide when to call
    parameters?: {          // JSON Schema for arguments
        type: "object";
        properties: Record<string, JSONSchema>;
        required?: string[];
    };
    handler: (args: any, invocation: ToolInvocation) => Promise<string | ToolResultObject>;
}

interface ToolInvocation {
    sessionId: string;
    toolCallId: string;
    toolName: string;
}

interface ToolResultObject {
    textResultForLlm: string;
    resultType?: "success" | "failure" | "rejected" | "denied";
}
```

### Handler Return Types

| Return | Effect |
|--------|--------|
| `string` | Treated as success result |
| `{ textResultForLlm, resultType: "success" }` | Structured success |
| `{ textResultForLlm, resultType: "failure" }` | Structured failure |
| `undefined` | Empty success |
| `throw Error` | Failure with error message |

---

## Hook Signatures

All hook inputs include `timestamp` (unix ms) and `cwd` (working directory).
All handlers receive `(input, invocation)` where `invocation` has `{ sessionId }`.

### onUserPromptSubmitted

**Fires:** When the user sends a message, before the agent sees it.

**Input:** `{ prompt: string, timestamp: number, cwd: string }`

**Output (all optional):**

| Field | Type | Effect |
|-------|------|--------|
| `modifiedPrompt` | `string` | Replaces the user's prompt |
| `additionalContext` | `string` | Appended as hidden context the agent sees |

### onPreToolUse

**Fires:** Before any tool executes.

**Input:** `{ toolName: string, toolArgs: unknown, timestamp: number, cwd: string }`

**Output (all optional):**

| Field | Type | Effect |
|-------|------|--------|
| `permissionDecision` | `"allow" \| "deny" \| "ask"` | Override permission check |
| `permissionDecisionReason` | `string` | Shown to user if denied |
| `modifiedArgs` | `unknown` | Replaces tool arguments |
| `additionalContext` | `string` | Injected into conversation |

### onPostToolUse

**Fires:** After any tool executes.

**Input:** `{ toolName: string, toolArgs: unknown, toolResult: ToolResultObject, timestamp: number, cwd: string }`

**Output (all optional):**

| Field | Type | Effect |
|-------|------|--------|
| `modifiedResult` | `ToolResultObject` | Replaces the tool result |
| `additionalContext` | `string` | Injected into conversation |

### onSessionStart

**Fires:** When a session starts or resumes.

**Input:** `{ source: "startup" | "resume" | "new", initialPrompt?: string, timestamp: number, cwd: string }`

**Output (all optional):**

| Field | Type | Effect |
|-------|------|--------|
| `additionalContext` | `string` | Injected as initial context |

### onSessionEnd

**Fires:** When a session ends.

**Input:** `{ reason: "complete" | "error" | "abort" | "timeout" | "user_exit", finalMessage?: string, error?: string, timestamp: number, cwd: string }`

**Output (all optional):**

| Field | Type | Effect |
|-------|------|--------|
| `sessionSummary` | `string` | Summary for session persistence |
| `cleanupActions` | `string[]` | Cleanup descriptions |

### onErrorOccurred

**Fires:** When an error occurs.

**Input:** `{ error: string, errorContext: "model_call" | "tool_execution" | "system" | "user_input", recoverable: boolean, timestamp: number, cwd: string }`

**Output (all optional):**

| Field | Type | Effect |
|-------|------|--------|
| `errorHandling` | `"retry" \| "skip" \| "abort"` | How to handle the error |
| `retryCount` | `number` | Max retries (when "retry") |
| `userNotification` | `string` | Message shown to the user |

---

## Session Object

### session.log(message, options?)

Log to CLI timeline. Never use `console.log()`.

```javascript
await session.log("Info message");
await session.log("Warning", { level: "warning" });
await session.log("Error", { level: "error" });
await session.log("Temporary", { ephemeral: true }); // Not persisted
```

### session.send(options)

Send a message programmatically (fire-and-forget):

```javascript
await session.send({ prompt: "Analyze test results." });
await session.send({
    prompt: "Review this file",
    attachments: [{ type: "file", path: "./src/index.ts" }],
});
```

### session.sendAndWait(options, timeout?)

Send and block until agent finishes:

```javascript
const response = await session.sendAndWait({ prompt: "What is 2+2?" });
// response?.data.content contains the agent's reply
```

### session.setModel(modelId)

Switch model for this session. Takes effect on the **next** message.

```javascript
await session.setModel("claude-haiku-4.5");
```

### session.on(eventType, handler)

Subscribe to session events. Returns an unsubscribe function.

```javascript
const unsub = session.on("tool.execution_complete", (event) => {
    // event.data.toolName, event.data.success
});
unsub(); // Stop listening
```

### session.workspacePath

Path to session workspace (checkpoints, plan.md, files/). `undefined` if infinite sessions disabled.

### session.rpc

Low-level typed RPC access:

```javascript
session.rpc.model.getCurrent()           // { modelId }
session.rpc.model.switchTo({ modelId })  // Switch model
session.rpc.models.list()                // ModelInfo[]
session.rpc.fleet.start({ prompt })      // Activate fleet mode
```

---

## Session Event Types

| Event | Key Data Fields |
|-------|----------------|
| `assistant.message` | `content`, `messageId`, `toolRequests` |
| `assistant.streaming_delta` | `totalResponseSizeBytes` |
| `assistant.turn_start` | `turnId` |
| `tool.execution_start` | `toolCallId`, `toolName`, `arguments` |
| `tool.execution_complete` | `toolCallId`, `toolName`, `success`, `result`, `error` |
| `user.message` | `content`, `attachments`, `source` |
| `session.idle` | `backgroundTasks` |
| `session.error` | `errorType`, `message`, `stack` |
| `session.model_change` | `previousModel`, `newModel`, reasoning effort |
| `session.shutdown` | `shutdownType`, `totalPremiumRequests`, `codeChanges`, `currentModel` |
| `permission.requested` | `requestId`, `permissionRequest.kind` |
| `subagent.started` | Subagent lifecycle |
| `subagent.completed` | Subagent lifecycle |
| `subagent.failed` | Subagent lifecycle |
| `subagent.selected` | Subagent lifecycle |
| `subagent.deselected` | Subagent lifecycle |

---

## Permission Handler

```javascript
const session = await joinSession({
    onPermissionRequest: async (request) => {
        // request.kind: "shell" | "write" | etc.
        // request.fullCommandText (for shell)
        if (request.kind === "shell") return { kind: "approved" };
        if (request.kind === "write") return { kind: "approved" };
        return { kind: "denied-by-rules" };
    },
});
```

Use `approveAll` from SDK to auto-approve everything:

```javascript
import { approveAll } from "@github/copilot-sdk";
const session = await joinSession({ onPermissionRequest: approveAll });
```

---

## User Input Handler

Enable the agent's `ask_user` tool:

```javascript
const session = await joinSession({
    onUserInputRequest: async (request) => {
        // request.question, request.choices
        return { answer: "yes", wasFreeform: false };
    },
});
```

---

## Gotchas

1. **stdout is reserved** — `console.log()` corrupts JSON-RPC. Always use `session.log()`.
2. **Tool name collisions are fatal** — If two extensions register the same tool name, the second fails to load.
3. **Don't call `session.send()` from `onUserPromptSubmitted` synchronously** — Use `setTimeout(() => session.send(...), 0)` to avoid infinite loops.
4. **Extensions are reloaded on `/clear`** — Any in-memory state is lost between sessions.
5. **Only `.mjs` is supported** — TypeScript (`.ts`) is not yet supported.
6. **`setModel()` takes effect next turn** — The current turn continues on the old model.
7. **Subagent model inheritance** — Subagents inherit the main session's model. No per-subagent model override.

---

## Extensions vs Hooks (hooks.json)

| Aspect | Extension Hooks | hooks.json Hooks |
|--------|----------------|-----------------|
| Language | JavaScript (async) | Shell commands (bash/powershell) |
| Modify prompts | ✅ `modifiedPrompt` | ❌ |
| Modify tool args | ✅ `modifiedArgs` | ❌ |
| Modify tool results | ✅ `modifiedResult` | ❌ |
| Permission control | ✅ `permissionDecision` | ❌ |
| Model switching | ✅ `session.setModel()` | ❌ |
| Event subscription | ✅ `session.on()` | ❌ |
| Cross-platform | ✅ (Node.js) | ⚠️ (need both bash & powershell) |
| No runtime needed | ❌ (requires Node.js) | ✅ |
| Plugin-bundleable | ❌ (not yet) | ✅ (via hooks.json) |

---

## Template

For a complete starter template, see: [jongio/copilot-cli-extension-template](https://github.com/jongio/copilot-cli-extension-template)
