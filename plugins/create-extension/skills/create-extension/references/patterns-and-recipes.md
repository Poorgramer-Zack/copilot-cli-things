# Extension Patterns & Recipes

Common patterns for Copilot CLI extensions. Each recipe is a self-contained example ready to adapt.

---

## 1. Tool That Calls an External API

Use `fetch()` to call REST APIs from a custom tool.

```js
{
    name: "fetch_weather",
    description: "Gets current weather for a city",
    parameters: {
        type: "object",
        properties: {
            city: { type: "string", description: "City name" },
        },
        required: ["city"],
    },
    handler: async (args) => {
        try {
            const res = await fetch(
                `https://api.example.com/weather?q=${encodeURIComponent(args.city)}`
            );
            if (!res.ok) {
                return { textResultForLlm: `Error: HTTP ${res.status}`, resultType: "failure" };
            }
            const data = await res.json();
            return JSON.stringify(data, null, 2);
        } catch (err) {
            return { textResultForLlm: err.message, resultType: "failure" };
        }
    },
}
```

**Key points:**
- Use `encodeURIComponent()` for query parameters
- Return structured JSON as a string for the agent to parse
- Handle HTTP errors and network failures gracefully

---

## 2. Tool That Runs a Shell Command

Use `child_process.execFile()` to run commands cross-platform.

```js
import { execFile } from "node:child_process";

{
    name: "run_tests",
    description: "Runs the project test suite",
    parameters: { type: "object", properties: {}, required: [] },
    handler: async () => {
        const isWindows = process.platform === "win32";
        const shell = isWindows ? "powershell" : "bash";
        const shellArgs = isWindows
            ? ["-NoProfile", "-Command", "npm test"]
            : ["-c", "npm test"];
        return new Promise((resolve) => {
            execFile(shell, shellArgs, { timeout: 60000 }, (err, stdout, stderr) => {
                if (err) {
                    resolve({ textResultForLlm: stderr || err.message, resultType: "failure" });
                } else {
                    resolve(stdout || "Tests passed.");
                }
            });
        });
    },
}
```

**Key points:**
- Always handle platform differences (`powershell` vs `bash`)
- Set a `timeout` to prevent hanging commands
- Return stderr on failure so the agent can diagnose issues

---

## 3. Inject Team Standards via onUserPromptSubmitted

Append hidden context to every user prompt with coding standards.

```js
hooks: {
    onUserPromptSubmitted: async () => ({
        additionalContext: `
Follow these team standards:
- Use TypeScript strict mode
- All functions must have JSDoc comments
- Use 2-space indentation
- Prefer const over let
        `.trim(),
    }),
}
```

**Key points:**
- Use `additionalContext` (not `modifiedPrompt`) to preserve the user's original message
- The context is hidden from the user but visible to the agent
- Keep injected context focused and concise

---

## 4. Block Dangerous Shell Commands via onPreToolUse

Intercept tool calls to prevent destructive operations.

```js
hooks: {
    onPreToolUse: async (input) => {
        if (input.toolName === "powershell" || input.toolName === "bash") {
            const cmd = String(input.toolArgs?.command || "");
            const dangerous = [
                /rm\s+-rf\s+\//i,
                /Remove-Item\s+.*-Recurse/i,
                /format\s+[a-z]:/i,
                /mkfs/i,
                /dd\s+if=/i,
            ];
            if (dangerous.some((re) => re.test(cmd))) {
                return {
                    permissionDecision: "deny",
                    permissionDecisionReason: "Blocked: potentially destructive command.",
                };
            }
        }
    },
}
```

**Key points:**
- Match on `toolName` to target specific tools
- Use regex patterns for flexible command matching
- Return `permissionDecision: "deny"` with a reason to block execution
- Consider both Windows (`Remove-Item`) and Unix (`rm -rf`) patterns

---

## 5. Auto-Lint After File Edits via onPostToolUse

Automatically run a linter after file edits and inject results as context.

```js
import { exec } from "node:child_process";

hooks: {
    onPostToolUse: async (input) => {
        if (
            (input.toolName === "edit" || input.toolName === "create") &&
            input.toolArgs?.path?.endsWith(".ts")
        ) {
            const result = await new Promise((resolve) => {
                exec(`npx eslint "${input.toolArgs.path}"`, (err, stdout) => {
                    resolve(err ? stdout : "No lint errors.");
                });
            });
            return {
                additionalContext: `Lint result for ${input.toolArgs.path}: ${result}`,
            };
        }
    },
}
```

**Key points:**
- Filter by `toolName` and file extension to limit scope
- Use `additionalContext` to feed lint results back to the agent
- The agent will see lint errors and can self-correct

---

## 6. Copy Agent Responses to Clipboard

Copy the agent's response to the clipboard when the user's prompt contains "copy".

```js
import { execFile } from "node:child_process";

let copyNext = false;

const session = await joinSession({
    onPermissionRequest: approveAll,
    hooks: {
        onUserPromptSubmitted: async (input) => {
            if (/\bcopy\b/i.test(input.prompt)) copyNext = true;
        },
    },
    tools: [],
});

session.on("assistant.message", (event) => {
    if (copyNext) {
        copyNext = false;
        const cmd = process.platform === "win32" ? "clip" : "pbcopy";
        const proc = execFile(cmd, [], () => {});
        proc.stdin.write(event.data.content);
        proc.stdin.end();
    }
});
```

**Key points:**
- Use a flag variable to communicate between hook and event handler
- Handle platform differences for clipboard commands
- The event handler is fire-and-forget (no return value needed)

---

## 7. Track File Changes

Log file changes as they happen using the `tool.execution_complete` event.

```js
session.on("tool.execution_complete", (event) => {
    if (
        event.data.success &&
        (event.data.toolName === "edit" || event.data.toolName === "create")
    ) {
        session.log(`File changed: ${event.data.arguments?.path}`, { ephemeral: true });
    }
});
```

**Key points:**
- Filter by `event.data.success` to only track successful operations
- Use `{ ephemeral: true }` for transient log entries that don't persist
- Correlate `tool.execution_start` and `tool.execution_complete` by `toolCallId`

---

## 8. Session-Start Context Injection

Inject different context based on whether the session is new or resumed.

```js
hooks: {
    onSessionStart: async (input) => {
        if (input.source === "startup") {
            return {
                additionalContext: "This is a new session. Ask the user what they need.",
            };
        }
        if (input.source === "resume") {
            return {
                additionalContext: "This is a resumed session. Check plan.md for context.",
            };
        }
    },
}
```

**Key points:**
- `input.source` indicates how the session started: `"startup"`, `"resume"`, or `"new"`
- Use this to provide session-type-specific instructions
- `input.initialPrompt` contains the first user message (if any)
