---
name: copilot-cli-configurator
description: "GitHub Copilot CLI configuration and setup: custom instructions (copilot-instructions.md, AGENTS.md), managing skills, configuring hooks (hooks.json), MCP servers (mcp-config.json), custom agents (.agent.md), installing plugins, extensions placement. Use when choosing between customization surfaces, setting up config files, managing installed components, or debugging configuration loading order."
---

# Copilot CLI Configurator

Set up and configure GitHub Copilot CLI customization surfaces. For **creating** skills, extensions, or MCP servers from scratch, use the dedicated `skill-creator`, `create-extension`, or `mcp-builder` skills instead.

## Choosing the Right Customization

| Goal | Use |
|------|-----|
| Copilot should always follow repo conventions | **Custom instructions** |
| Repeatable workflow invoked on demand | **Skills** |
| Guardrails, policy, or automation around tool use | **Hooks** |
| External tools and data sources | **MCP servers** |
| Specialist persona with constrained toolset | **Custom agents** |
| Custom tools, programmatic hooks, model switching | **Extensions** |
| Bundle of functionality to distribute | **Plugins** |

Read `references/feature-comparison.md` for detailed trade-offs between each surface.

---

## 1. Custom Instructions

Persistent guidance loaded at session start — tells Copilot **how to behave** across all tasks.

### File Locations

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

Skills are folders loaded on demand for specialized tasks. Use `skill-creator` for building new skills — this section covers management only.

### Storage Locations

- **Project**: `.github/skills/` or `.claude/skills/`
- **Personal**: `~/.copilot/skills/` or `~/.claude/skills/`

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
- Copilot auto-triggers based on the skill's `description` field

---

## 3. Hooks

Hooks execute shell commands at lifecycle points during a session. Read `references/hooks-reference.md` for the full schema.

### Configuration

Place `hooks.json` in `.github/hooks/` (repo) or configure via CLI.

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
    "errorOccurred": [],
    "agentStop": [],
    "subagentStop": []
  }
}
```

### Available Triggers

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
- `bash` / `powershell`: Shell command (provide both for cross-platform)
- `cwd`: Working directory (optional)
- `timeoutSec`: Timeout in seconds (default 30)
- `env`: Environment variables as key-value object (optional)

### When to Use

- Tool guardrails (e.g., block edits to `infra/` without a ticket)
- Session lifecycle automation (e.g., archive transcripts)
- Error handling policy
- Subagent workflow control

---

## 4. MCP Servers

Connect external tools and data sources via the Model Context Protocol. The GitHub MCP server is built in — these steps are for adding other servers. Use `mcp-builder` for developing new MCP servers.

### Adding via CLI

In interactive mode: `/mcp add` — fill in the form (Tab to navigate, Ctrl+S to save).

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

### CLI Commands

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

Custom agents define specialized expertise for specific task types, running as subagents with their own context window. Read `references/custom-agents-reference.md` for the full property list and tool aliases.

### File Locations

- **Project**: `.github/agents/`
- **User**: `~/.copilot/agents/`

User-level agents override project-level agents with the same name.

### Agent File Format

Each agent is a `.agent.md` file:

```markdown
---
name: security-auditor
description: Checks code for security vulnerabilities. Use when security review/check/audit is requested.
tools: ["read", "search", "bash"]
---

You are a security specialist. Check for exposed secrets, XSS/SQL injection risks, vulnerable dependencies, and auth bypass opportunities.
```

### Tools Configuration

- Omit `tools` or use `tools: ["*"]` → all tools enabled
- `tools: []` → no tools (analysis-only agent)
- `tools: ["read", "search", "edit"]` → specific tools only

Common aliases: `execute`/`shell` (shell), `read` (files), `edit`/`Write` (editing), `search`/`Grep`/`Glob` (search), `agent`/`Task` (subagents), `web` (web access).

### MCP Servers in Agent Profiles

Agents can define their own MCP connections in frontmatter:

```yaml
mcp-servers:
  custom-mcp:
    type: "local"
    command: "some-command"
    args: ["--arg1"]
    tools: ["*"]
    env:
      API_KEY: ${{ secrets.MY_API_KEY }}
```

### Using Custom Agents

- `/agent` → select from list interactively
- Explicit: `Use the security-auditor agent on src/`
- Copilot auto-delegates based on agent description
- CLI: `copilot --agent security-auditor --prompt "Check src/"`

### CLI Creation Wizard

In interactive mode: `/agent` → **Create new agent** → choose Project or User → describe or fill manually → select tools → restart CLI.

---

## 6. Extensions

Extensions are Node.js child processes that add custom tools, programmatic hooks, and event-driven behaviors via `@github/copilot-sdk`. Use `create-extension` for developing new extensions — this section covers placement and management.

### File Locations

```
.github/extensions/my-extension/
  extension.mjs        ← Entry point (required, must be .mjs)
```

- **Project**: `.github/extensions/` (relative to git root)
- **User**: `~/.copilot/extensions/`
- Project extensions shadow user extensions on name collision

### CLI Commands

| Command | Action |
|---------|--------|
| `extensions_manage({ operation: "list" })` | List loaded extensions |
| `extensions_manage({ operation: "inspect", name: "NAME" })` | Extension details |
| `extensions_manage({ operation: "scaffold", name: "NAME" })` | Generate skeleton |
| `extensions_reload({})` | Reload all extensions |

### Lifecycle

- Discovered and forked at CLI startup
- Reloaded on `/clear` (in-memory state is lost)
- Stopped on CLI exit (SIGTERM, then SIGKILL after 5s)

### When to Use (vs Other Surfaces)

| Need | Extension? | Alternative |
|------|-----------|-------------|
| Custom tool with dynamic logic | ✅ | — |
| Block dangerous commands programmatically | ✅ | Hooks (shell, less flexible) |
| Switch model mid-session automatically | ✅ | — |
| React to session events in real-time | ✅ | — |
| Static coding rules / conventions | ❌ | Custom instructions |
| Workflow instructions (how-to) | ❌ | Skills |
| Specialist persona | ❌ | Custom agents |
| Connect external API as tool | ⚠️ | MCP server (if protocol fits) |

---

## 7. Plugins

Plugins bundle agents, skills, hooks, and MCP configs into distributable packages. Read `references/plugin-reference.md` for full schemas.

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

### CLI Commands

| Command | Action |
|---------|--------|
| `copilot plugin marketplace list` | List registered marketplaces |
| `copilot plugin marketplace browse NAME` | Browse plugins in a marketplace |
| `copilot plugin marketplace add OWNER/REPO` | Register a marketplace |
| `copilot plugin marketplace remove NAME` | Unregister (use `--force` if plugins still installed) |

Default marketplaces: `copilot-plugins`, `awesome-copilot`.

---

## Loading Order & Precedence

**Agents & Skills** — first-found-wins:
1. `~/.copilot/agents/` (user, .github convention)
2. `<project>/.github/agents/` (project)
3. Parent directories (monorepo)
4. `~/.claude/agents/` (user, .claude convention)
5. `<project>/.claude/agents/` (project, .claude convention)
6. Plugin agents (by install order)
7. Remote org/enterprise (via API)

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

1. **Clarify the goal** — what behavior do they want?
2. **Recommend the right surface** — use the comparison table above
3. **Generate config files** — create files with proper structure
4. **Explain file placement** — specify exactly where files go
5. **Verify** — suggest commands to confirm configuration loaded

For detailed schemas, read the `references/` directory.
