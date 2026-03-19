// ============================================================================
// Copilot CLI Extension Template
//
// INSTRUCTIONS FOR CODING AGENTS:
//   1. Copy this entire folder to .github/extensions/<your-extension-name>/
//   2. Rename nothing — the file MUST be called extension.mjs
//   3. Edit the sections below based on the user's requirements
//   4. Delete any sections you don't need (tools, hooks, events)
//   5. Run extensions_reload() to load the extension
//   6. Run extensions_manage({ operation: "inspect", name: "<name>" }) to verify
//
// RULES:
//   - Never use console.log() — stdout is JSON-RPC. Use session.log() instead.
//   - Tool names must be globally unique across all extensions.
//   - Don't npm install @github/copilot-sdk — it's provided by the CLI runtime.
//   - Always use try/catch in handlers — unhandled errors crash the process.
//   - Only .mjs files are supported (ES modules).
// ============================================================================

import { approveAll } from "@github/copilot-sdk";
import { joinSession } from "@github/copilot-sdk/extension";

// Platform detection (use where needed)
const isWindows = process.platform === "win32";

// ============================================================================
// TOOLS — Functions the agent can call
// ============================================================================
// Define your custom tools here. Each tool needs:
//   - name: unique identifier (snake_case recommended)
//   - description: what it does (agent reads this to decide when to call it)
//   - parameters: JSON Schema for arguments (optional)
//   - handler: async function that does the work and returns a result
//
// Handler return types:
//   - string → treated as success
//   - { textResultForLlm: string, resultType: "success"|"failure"|"rejected"|"denied" }
//   - undefined → empty success
//   - throw Error → failure with error message

const tools = [
    // --- EXAMPLE TOOL: Remove or replace with your own ---
    // {
    //     name: "my_tool",
    //     description: "Describe what this tool does",
    //     parameters: {
    //         type: "object",
    //         properties: {
    //             input: { type: "string", description: "The input value" },
    //         },
    //         required: ["input"],
    //     },
    //     handler: async (args, invocation) => {
    //         try {
    //             // Your logic here
    //             return `Result: ${args.input}`;
    //         } catch (err) {
    //             return { textResultForLlm: err.message, resultType: "failure" };
    //         }
    //     },
    // },
];

// ============================================================================
// HOOKS — Intercept and modify behavior at lifecycle points
// ============================================================================
// All hooks are optional. Delete any you don't need.
// All hook inputs include: timestamp (unix ms), cwd (working directory)
// All hooks receive (input, invocation) where invocation has { sessionId }

const hooks = {
    // --- Fires when the user sends a message, before the agent sees it ---
    // onUserPromptSubmitted: async (input, invocation) => {
    //     // input.prompt — the user's message
    //     return {
    //         // modifiedPrompt: "rewritten prompt",     // Replace the prompt
    //         // additionalContext: "extra instructions", // Append hidden context
    //     };
    // },

    // --- Fires before any tool executes ---
    // onPreToolUse: async (input, invocation) => {
    //     // input.toolName — tool about to run
    //     // input.toolArgs — arguments passed
    //     return {
    //         // permissionDecision: "allow" | "deny" | "ask",
    //         // permissionDecisionReason: "why denied",
    //         // modifiedArgs: { ...input.toolArgs, extra: "value" },
    //         // additionalContext: "injected context",
    //     };
    // },

    // --- Fires after any tool executes ---
    // onPostToolUse: async (input, invocation) => {
    //     // input.toolName — tool that ran
    //     // input.toolArgs — arguments that were passed
    //     // input.toolResult — the result object
    //     return {
    //         // modifiedResult: { textResultForLlm: "new result", resultType: "success" },
    //         // additionalContext: "additional info",
    //     };
    // },

    // --- Fires when a session starts or resumes ---
    // onSessionStart: async (input, invocation) => {
    //     // input.source — "startup" | "resume" | "new"
    //     // input.initialPrompt — first user message (if any)
    //     return {
    //         // additionalContext: "initial instructions",
    //     };
    // },

    // --- Fires when a session ends ---
    // onSessionEnd: async (input, invocation) => {
    //     // input.reason — "complete" | "error" | "abort" | "timeout" | "user_exit"
    //     // input.finalMessage, input.error
    //     return {
    //         // sessionSummary: "what happened",
    //         // cleanupActions: ["action 1", "action 2"],
    //     };
    // },

    // --- Fires on errors ---
    // onErrorOccurred: async (input, invocation) => {
    //     // input.error — error message
    //     // input.errorContext — "model_call" | "tool_execution" | "system" | "user_input"
    //     // input.recoverable — boolean
    //     return {
    //         // errorHandling: "retry" | "skip" | "abort",
    //         // retryCount: 2,
    //         // userNotification: "something went wrong",
    //     };
    // },
};

// ============================================================================
// SESSION — Connect to the CLI
// ============================================================================

const session = await joinSession({
    onPermissionRequest: approveAll,
    tools,
    hooks,

    // --- Optional: Handle agent questions (enables ask_user tool) ---
    // onUserInputRequest: async (request) => {
    //     // request.question — the agent's question
    //     // request.choices — options (if multiple choice)
    //     return { answer: "yes", wasFreeform: false };
    // },
});

// ============================================================================
// EVENTS — React to session events in real time
// ============================================================================
// Subscribe after joinSession(). Returns unsubscribe function.
// Delete any you don't need.

// --- React to agent responses ---
// session.on("assistant.message", (event) => {
//     // event.data.content — the agent's response text
//     // event.data.messageId
// });

// --- React to tool execution ---
// session.on("tool.execution_start", (event) => {
//     // event.data.toolCallId, event.data.toolName, event.data.arguments
// });
// session.on("tool.execution_complete", (event) => {
//     // event.data.toolCallId, event.data.toolName
//     // event.data.success, event.data.result, event.data.error
// });

// --- React to user messages ---
// session.on("user.message", (event) => {
//     // event.data.content, event.data.attachments, event.data.source
// });

// --- React when agent finishes a turn ---
// session.on("session.idle", (event) => {
//     // event.data.backgroundTasks
// });

// --- React to session shutdown ---
// session.on("session.shutdown", (event) => {
//     // event.data.shutdownType, event.data.totalPremiumRequests
// });

// ============================================================================
// STARTUP LOG
// ============================================================================

await session.log("Extension loaded");
