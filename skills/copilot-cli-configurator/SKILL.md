---
name: copilot-cli-configurator
description: Expert guide for configuring and customizing GitHub Copilot CLI. Use this skill whenever the user wants to set up custom instructions, create skills, add hooks, configure MCP servers, create custom agents, build or install plugins, set up a plugin marketplace, build extensions with the Copilot SDK, or compare CLI customization features. Also use when users mention copilot-instructions.md, AGENTS.md, SKILL.md, hooks.json, .mcp.json, .agent.md, plugin.json, marketplace.json, extension.mjs, @github/copilot-sdk, joinSession, or any Copilot CLI configuration topic — even if they don't explicitly say "configure Copilot CLI."
---

# Copilot CLI Configurator

An expert guide for configuring and customizing GitHub Copilot CLI. This skill covers every customization surface: custom instructions, skills, hooks, MCP servers, custom agents, and plugins.

## Choosing the Right Customization

Before diving into implementation, identify which customization fits the user's goal:

| Goal | Use |
|------|-----|
| Copilot should always follow repo conventions | **Custom instructions** |
| Repeatable workflow invoked on demand | **Skills** |
| Guardrails, policy, or automation around tool use | **Hooks** |
| External tools and data sources | **MCP servers** |
| Specialist persona with constrained toolset | **Custom agents** |
| Custom tools, programmatic hooks, model switching, event reactions | **Extensions** |
| Bundle of functionality to distribute | **Plugins** |

Read `references/feature-comparison.md` for a detailed breakdown of when to use each feature and their trade-offs.

---

## 1. Custom Instructions

Custom instructions are persistent guidance loaded at session start. They tell Copilot **how to behave** across all tasks.

### Types & File Locations

| Type | File | Location |
|------|------|----------|
| Repository-wide | `copilot-instructions.md` | `.github/` |
| Path-specific | `*.instructions.md` | `.github/instructions/` (supports subdirs) |
| Agent instructions | `AGENTS.md` | Repo root, cwd, or `COPILOT_CUSTOM_INSTRUCTIONS_DIRS` paths |
| Local/personal | `copilot-instructions.md` | `~/.copilot/` |

Also supports `CLAUDE.md` and `GEMINI.md` at repo root.

### Path-Specific Instructions

Require YAML frontmatter with `applyTo` glob:

```markdown
---
applyTo: "**/*.ts,**/*.tsx"
---

Use strict TypeScript with no `any` types. Prefer interfaces over type aliases.
```

Optional `excludeAgent` field to exclude `"code-review"` or `"coding-agent"`.

### When to Use

- Style and quality rules (e.g., "prefer small PRs, write tests")
- Repository conventions (e.g., "use pnpm, keep CHANGELOG.md updated")
- Communication preferences (e.g., "explain tradeoffs briefly")

### When NOT to Use

- Behavior needed only in one workflow → use a **skill**
- Instructions are too large or specific → use a **skill** or **custom agent**

---

## 2. Skills

Skills are folders of instructions, scripts, and resources loaded on demand for specialized tasks.

### Creating a Skill

Structure:

```
.github/skills/my-skill/
├── SKILL.md          # Required
├── scripts/          # Optional executables
├── references/       # Optional docs
└── assets/           # Optional templates
```

Storage locations:
- **Project**: `.github/skills/` or `.claude/skills/`
- **Personal**: `~/.copilot/skills/` or `~/.claude/skills/`

### SKILL.md Format

```markdown
---
name: my-skill-name
description: What this skill does and when Copilot should use it. Be specific and slightly "pushy" about triggering contexts.
---

Instructions in Markdown for how Copilot should perform the task.
```

The `name` field must be lowercase with hyphens. The `description` is the primary triggering mechanism — include both what the skill does AND specific contexts for when to use it.

### CLI Commands

| Command | Action |
|---------|--------|
| `/skills list` | List available skills |
| `/skills` | Toggle skills on/off interactively |
| `/skills info` | Details about a skill |
| `/skills add` | Add skills location |
| `/skills reload` | Reload skills mid-session |
| `/skills remove SKILL-DIR` | Remove a directly-added skill |

### Invoking a Skill

- Slash command: `/my-skill do something`
- Copilot auto-triggers based on the skill's description

---

## 3. Hooks

Hooks execute shell commands at key lifecycle points during a session. Read `references/hooks-reference.md` for the full configuration schema and available triggers.

### Creating Hooks

Place `hooks.json` files in `.github/hooks/` (repo) or configure via the CLI.

```json
{
  "version": 1,
  "hooks": {
    "sessionStart": [
      {
        "type": "command",
        "bash": "echo \"Session started: $(date)\" >> logs/session.log",
        "powershell": "Add-Content -Path logs/session.log -Value \"Session started: $(Get-Date)\"",
        "cwd": ".",
        "timeoutSec": 10
      }
    ],
    "preToolUse": [],
    "postToolUse": [],
    "userPromptSubmitted": [],
    "sessionEnd": [],
    "errorOccurred": []
  }
}
```

### Available Hook Triggers

| Hook | When It Runs |
|------|-------------|
| `sessionStart` / `sessionEnd` | Start/end of session |
| `userPromptSubmitted` | When user submits a prompt |
| `preToolUse` / `postToolUse` | Before/after a tool runs |
| `errorOccurred` | When an error occurs |
| `agentStop` | When main agent stops |
| `subagentStop` | When a subagent completes |

### Hook Entry Properties

- `type`: Always `"command"`
- `bash` / `powershell`: Shell command to run (provide both for cross-platform)
- `cwd`: Working directory (optional)
- `timeoutSec`: Timeout in seconds (default 30)
- `env`: Environment variables as key-value object (optional)

### When to Use Hooks

- Tool guardrails (e.g., block edits to `infra/` without a ticket ID)
- Session lifecycle automation (e.g., archive transcripts)
- Error handling policy (e.g., auto-retry on rate limits)
- Subagent workflow control (e.g., validate subagent output)

---

## 4. MCP Servers

MCP (Model Context Protocol) lets you connect external tools and data sources to Copilot CLI. The GitHub MCP server is built in — these steps are for adding other servers.

### Adding via CLI

In interactive mode: `/mcp add` — then fill in the form (Tab to navigate, Ctrl+S to save).

Server types:
- **Local / STDIO**: Starts a local process, communicates over stdin/stdout
- **HTTP / SSE**: Connects to a remote server

### Configuration File

Edit `~/.copilot/mcp-config.json` directly:

```json
{
  "mcpServers": {
    "playwright": {
      "type": "local",
      "command": "npx",
      "args": ["@playwright/mcp@latest"],
      "env": {},
      "tools": ["*"]
    },
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp",
      "headers": {
        "CONTEXT7_API_KEY": "YOUR-API-KEY"
      },
      "tools": ["*"]
    }
  }
}
```

### MCP CLI Commands

| Command | Action |
|---------|--------|
| `/mcp show` | List configured servers and status |
| `/mcp show SERVER` | Details of a specific server |
| `/mcp add` | Add a server interactively |
| `/mcp edit SERVER` | Edit a server's config |
| `/mcp delete SERVER` | Remove a server |
| `/mcp disable SERVER` | Temporarily disable |
| `/mcp enable SERVER` | Re-enable |

### Tools Property

- `"*"` — all tools from the server
- Comma-separated list of tool names
- Namespace prefix: `some-mcp-server/some-tool`

---

## 5. Custom Agents

Custom agents define specialized expertise for specific task types. They run as subagents with their own context window.

### Creating a Custom Agent

Each agent is a `.agent.md` file. Storage locations:
- **Project**: `.github/agents/`
- **User**: `~/.copilot/agents/`

User-level agents override project-level agents with the same name.

### Agent File Format

```markdown
---
name: security-auditor
description: Checks code for security vulnerabilities. Use when security review/check/audit is requested.
tools: ["read", "search", "bash"]
---

You are a security specialist. Your responsibilities:

- Check for exposed secrets or credentials
- Identify XSS and SQL injection risks
- Flag vulnerable dependencies
- Report authentication bypass opportunities

For each issue found, provide: risk level, file location, and recommended fix.
```

Read `references/custom-agents-reference.md` for the full YAML frontmatter property list and tool aliases.

### Tools Configuration

- Omit `tools` or use `tools: ["*"]` → all tools enabled
- `tools: []` → no tools (analysis-only agent)
- `tools: ["read", "search", "edit"]` → specific tools only

#### Tool Aliases

| Alias | Maps To |
|-------|---------|
| `execute` / `shell` / `Bash` / `powershell` | Shell execution |
| `read` / `Read` | File reading |
| `edit` / `Edit` / `Write` | File editing |
| `search` / `Grep` / `Glob` | Code search |
| `agent` / `Task` | Invoke other custom agents |
| `web` / `WebSearch` / `WebFetch` | Web access |

### MCP Servers in Agent Profiles

Agents can define their own MCP connections:

```markdown
---
name: my-agent-with-mcp
description: Agent with external tools
tools: ["read", "edit", "custom-mcp/tool-1"]
mcp-servers:
  custom-mcp:
    type: "local"
    command: "some-command"
    args: ["--arg1"]
    tools: ["*"]
    env:
      API_KEY: ${{ secrets.MY_API_KEY }}
---
```

### Using Custom Agents

- `/agent` → select from list interactively
- Explicit: `Use the security-auditor agent on src/`
- By inference: Copilot auto-delegates based on agent description
- Programmatic: `copilot --agent security-auditor --prompt "Check src/"`

### CLI Creation Wizard

In interactive mode: `/agent` → **Create new agent** → choose Project or User → describe or fill manually → select tools → restart CLI.

---

## 6. Extensions

Extensions are Node.js processes that add custom tools, programmatic hooks, and event-driven behaviors to Copilot CLI via the `@github/copilot-sdk`. Unlike hooks (shell commands) or skills (markdown instructions), extensions run as **live child processes** communicating over JSON-RPC.

### Architecture

```
┌─────────────────────┐     JSON-RPC / stdio      ┌──────────────────────┐
│   Copilot CLI        │ ◄────────────────────────► │  Extension Process   │
│   (parent process)   │   tool calls, events,     │  (forked child)      │
│                      │   hooks, model control    │                      │
│  • Discovers exts    │                            │  • Registers tools   │
│  • Forks processes   │                            │  • Registers hooks   │
│  • Routes tool calls │                            │  • Listens to events │
└─────────────────────┘                            └──────────────────────┘
```

### File Structure

```
.github/extensions/my-extension/
  extension.mjs        ← Entry point (required, must be .mjs)
```

Discovery locations:
- **Project**: `.github/extensions/` (relative to git root)
- **User**: `~/.copilot/extensions/`
- Project extensions shadow user extensions on name collision

### Minimal Extension

```javascript
import { joinSession } from "@github/copilot-sdk/extension";

const session = await joinSession({
    tools: [],       // Custom tools the agent can call
    hooks: {},       // Programmatic lifecycle hooks
});

await session.log("Extension loaded");
```

**Rules:**
- File must be named `extension.mjs` (only ES modules supported)
- Never use `console.log()` — stdout is reserved for JSON-RPC. Use `session.log()` instead
- `@github/copilot-sdk` is auto-resolved by the CLI runtime — do not npm install it
- Tool names must be globally unique across all loaded extensions

### Registering Custom Tools

```javascript
tools: [
    {
        name: "my_tool",
        description: "What it does — agent reads this to decide when to call it",
        parameters: {
            type: "object",
            properties: {
                input: { type: "string", description: "The input value" },
            },
            required: ["input"],
        },
        handler: async (args, invocation) => {
            // args: parsed arguments matching the schema
            // invocation: { sessionId, toolCallId, toolName }
            // Return: string (success) or { textResultForLlm, resultType }
            return `Result: ${args.input}`;
        },
    },
]
```

### Programmatic Hooks

Extension hooks are async functions (not shell commands like `hooks.json`). They can modify prompts, tool args, results, and permissions:

```javascript
hooks: {
    onUserPromptSubmitted: async (input) => {
        // input.prompt, input.timestamp, input.cwd
        return {
            modifiedPrompt: "rewritten prompt",      // Replace user's prompt
            additionalContext: "extra instructions",  // Append hidden context
        };
    },
    onPreToolUse: async (input) => {
        // input.toolName, input.toolArgs
        return {
            permissionDecision: "allow",  // "allow" | "deny" | "ask"
            modifiedArgs: { ...input.toolArgs },
            additionalContext: "injected context",
        };
    },
    onPostToolUse: async (input) => {
        // input.toolName, input.toolArgs, input.toolResult
        return {
            modifiedResult: { textResultForLlm: "new result", resultType: "success" },
            additionalContext: "additional info",
        };
    },
    onSessionStart: async (input) => {
        // input.source: "startup" | "resume" | "new"
        return { additionalContext: "initial instructions" };
    },
    onSessionEnd: async (input) => {
        // input.reason: "complete" | "error" | "abort" | "timeout" | "user_exit"
    },
    onErrorOccurred: async (input) => {
        // input.error, input.errorContext, input.recoverable
        return { errorHandling: "retry", retryCount: 2 };
    },
}
```

### Session Object

After `joinSession()`, the returned `session` provides:

| Method | Purpose |
|--------|---------|
| `session.log(message, options?)` | Log to CLI timeline (`level`: "info" / "warning" / "error") |
| `session.send({ prompt, attachments? })` | Send a message programmatically |
| `session.sendAndWait({ prompt })` | Send and wait for agent response |
| `session.setModel(modelId)` | Switch model (takes effect next turn) |
| `session.on(eventType, handler)` | Subscribe to session events (returns unsubscribe fn) |
| `session.workspacePath` | Path to session workspace directory |
| `session.rpc` | Low-level RPC access (model, fleet, mode, plan, etc.) |

### Key Session Events

```javascript
session.on("assistant.message", (event) => { /* event.data.content */ });
session.on("tool.execution_start", (event) => { /* event.data.toolName, arguments */ });
session.on("tool.execution_complete", (event) => { /* event.data.success, result */ });
session.on("user.message", (event) => { /* event.data.content */ });
session.on("session.idle", (event) => { /* agent finished a turn */ });
session.on("session.model_change", (event) => { /* event.data.previousModel, newModel */ });
session.on("subagent.started", (event) => { /* subagent lifecycle */ });
session.on("session.shutdown", (event) => { /* event.data.shutdownType */ });
```

### RPC APIs

The `session.rpc` object provides direct access to CLI internals:

```javascript
// Model control
await session.rpc.model.getCurrent();                    // { modelId }
await session.rpc.model.switchTo({ modelId: "gpt-5.1" }); // Switch model

// Fleet mode
await session.rpc.fleet.start({ prompt: "..." });        // Activate fleet

// List available models
await session.rpc.models.list();                         // ModelInfo[]
```

### CLI Commands

| Command | Action |
|---------|--------|
| `extensions_manage({ operation: "list" })` | List loaded extensions |
| `extensions_manage({ operation: "inspect", name: "NAME" })` | Extension details |
| `extensions_manage({ operation: "scaffold", name: "NAME" })` | Generate skeleton |
| `extensions_manage({ operation: "scaffold", name: "NAME", location: "user" })` | User-scoped |
| `extensions_reload({})` | Reload all extensions |

### Lifecycle

- Extensions are discovered and forked at CLI startup
- Reloaded on `/clear` (in-memory state is lost)
- Stopped on CLI exit (SIGTERM, then SIGKILL after 5s)
- Detached from session — they observe and modify, but don't own the conversation

### When to Use Extensions (vs Other Features)

| Need | Use Extension? | Alternative |
|------|---------------|-------------|
| Custom tool with dynamic logic | ✅ Yes | — |
| Block dangerous commands programmatically | ✅ Yes | Hooks (shell, less flexible) |
| Switch model mid-session automatically | ✅ Yes | — |
| React to session events in real-time | ✅ Yes | — |
| Inject context based on complex conditions | ✅ Yes | Hooks (shell, basic only) |
| Static coding rules / conventions | ❌ No | Custom instructions |
| Workflow instructions (how-to) | ❌ No | Skills |
| Specialist persona | ❌ No | Custom agents |
| Connect external API as tool | ⚠️ Maybe | MCP server (if protocol fits) |

### Example: Phase-Based Model Switching

```javascript
import { joinSession } from "@github/copilot-sdk/extension";

const PHASE_MODELS = {
    research: "claude-haiku-4.5",
    coding: "claude-sonnet-4.5",
    review: "claude-opus-4.6",
};

const session = await joinSession({
    tools: [{
        name: "set_task_phase",
        description: "Switch AI model based on task phase for cost optimization",
        parameters: {
            type: "object",
            properties: {
                phase: { type: "string", enum: Object.keys(PHASE_MODELS) },
            },
            required: ["phase"],
        },
        handler: async (args) => {
            const model = PHASE_MODELS[args.phase];
            await session.setModel(model);
            return `Switched to ${model} for ${args.phase} phase`;
        },
    }],
});
```

### Example: External CLI as Consultant

```javascript
import { execFile } from "node:child_process";
import { joinSession } from "@github/copilot-sdk/extension";

const session = await joinSession({
    tools: [{
        name: "ask_gemini",
        description: "Consult Gemini for web search, research, or second opinion",
        parameters: {
            type: "object",
            properties: {
                prompt: { type: "string", description: "Question for Gemini" },
            },
            required: ["prompt"],
        },
        handler: async (args) => {
            return new Promise((resolve) => {
                execFile("gemini", ["-p", args.prompt],
                    { timeout: 60000 },
                    (err, stdout) => resolve(err ? `Error: ${err.message}` : stdout)
                );
            });
        },
    }],
});
```

### Template Reference

For a complete extension template with all sections, see [jongio/copilot-cli-extension-template](https://github.com/jongio/copilot-cli-extension-template).

Read `references/extensions-reference.md` for the full SDK type signatures, all event types, permission handlers, and gotchas.

---

## 7. Plugins

Plugins bundle agents, skills, hooks, and MCP configs into distributable packages. Read `references/plugin-reference.md` for the full plugin.json and marketplace.json schemas.

### Plugin Structure

```
my-plugin/
├── plugin.json           # Required manifest
├── agents/               # Custom agents (optional)
│   └── helper.agent.md
├── skills/               # Skills (optional)
│   └── deploy/
│       └── SKILL.md
├── hooks.json            # Hook configuration (optional)
└── .mcp.json             # MCP server config (optional)
```

### plugin.json Manifest

```json
{
  "name": "my-dev-tools",
  "description": "React development utilities",
  "version": "1.2.0",
  "author": {
    "name": "Jane Doe",
    "email": "jane@example.com"
  },
  "license": "MIT",
  "keywords": ["react", "frontend"],
  "agents": "agents/",
  "skills": ["skills/", "extra-skills/"],
  "hooks": "hooks.json",
  "mcpServers": ".mcp.json"
}
```

Only `name` is required. All other fields are optional.

### Installing Plugins

| Source | Command |
|--------|---------|
| Marketplace | `copilot plugin install PLUGIN@MARKETPLACE` |
| GitHub repo | `copilot plugin install OWNER/REPO` |
| GitHub subdir | `copilot plugin install OWNER/REPO:PATH/TO/PLUGIN` |
| Git URL | `copilot plugin install https://gitlab.com/o/r.git` |
| Local path | `copilot plugin install ./my-plugin` |

### Managing Plugins

| Command | Action |
|---------|--------|
| `copilot plugin list` | View installed plugins |
| `copilot plugin update NAME` | Update a plugin |
| `copilot plugin update --all` | Update all plugins |
| `copilot plugin uninstall NAME` | Remove a plugin |
| `copilot plugin disable NAME` | Disable temporarily |
| `copilot plugin enable NAME` | Re-enable |

### Plugin Storage

- Via marketplace: `~/.copilot/state/installed-plugins/MARKETPLACE/PLUGIN-NAME/`
- Direct install: `~/.copilot/state/installed-plugins/PLUGIN-NAME/`

---

## 8. Plugin Marketplaces

A marketplace is a registry of plugins for discovery and installation.

### Creating a Marketplace

Add a `marketplace.json` to `.github/plugin/` (or `.claude-plugin/`) of a repository:

```json
{
  "name": "my-marketplace",
  "owner": {
    "name": "Your Organization",
    "email": "plugins@example.com"
  },
  "metadata": {
    "description": "Curated plugins for our team",
    "version": "1.0.0"
  },
  "plugins": [
    {
      "name": "frontend-design",
      "description": "Create a professional-looking GUI",
      "version": "2.1.0",
      "source": "./plugins/frontend-design"
    }
  ]
}
```

### Marketplace CLI Commands

| Command | Action |
|---------|--------|
| `copilot plugin marketplace list` | List registered marketplaces |
| `copilot plugin marketplace browse NAME` | Browse plugins in a marketplace |
| `copilot plugin marketplace add OWNER/REPO` | Register a marketplace |
| `copilot plugin marketplace remove NAME` | Unregister (use `--force` if plugins still installed) |

Default marketplaces: `copilot-plugins`, `awesome-copilot`.

---

## Loading Order & Precedence

Understanding precedence prevents naming conflicts:

**Agents & Skills** — first-found-wins:
1. `~/.copilot/agents/` (user)
2. `<project>/.github/agents/` (project)
3. Parent directories (monorepo)
4. Plugin agents (by install order)

**Extensions** — project shadows user:
1. `~/.copilot/extensions/` (user)
2. `<project>/.github/extensions/` (project, higher priority)

**MCP Servers** — last-wins:
1. `~/.copilot/mcp-config.json` (lowest priority)
2. `.vscode/mcp.json` (workspace)
3. Plugin MCP configs
4. `--additional-mcp-config` flag (highest priority)

Built-in tools and agents are always present and cannot be overridden.

---

## Workflow: Helping Users Configure

When a user asks for help configuring Copilot CLI:

1. **Clarify the goal** — what behavior do they want to achieve?
2. **Recommend the right feature** — use the comparison table above
3. **Generate the config files** — create the correct files with proper structure
4. **Explain file placement** — specify exactly where files should go
5. **Verify** — suggest commands to confirm the configuration loaded correctly

For reference files with detailed schemas and configuration options, read the `references/` directory.
