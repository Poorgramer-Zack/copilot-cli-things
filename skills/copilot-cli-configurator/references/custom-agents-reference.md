# Custom Agents Configuration Reference

Full reference for custom agent `.agent.md` files in GitHub Copilot CLI.

## File Locations

| Level | Path | Priority |
|-------|------|----------|
| User (`.github` convention) | `~/.copilot/agents/` | 1st (highest) |
| Project (`.github` convention) | `<project>/.github/agents/` | 2nd |
| Parent directories (monorepo) | `<parents>/.github/agents/` | 3rd |
| User (`.claude` convention) | `~/.claude/agents/` | 4th |
| Project (`.claude` convention) | `<project>/.claude/agents/` | 5th |
| Plugin agents | `agents/` dirs in plugins | 6th |
| Remote org/enterprise | Via API | 7th (lowest) |

First-found-wins: if same name exists at multiple levels, the highest-priority one is used.

## YAML Frontmatter Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Agent identifier, displayed in agent list |
| `description` | string | Yes | Expertise description and when to use this agent |
| `tools` | string[] | No | Tool whitelist. Omit or `["*"]` for all tools. `[]` disables all. |
| `infer` | boolean | No | When `true`, Copilot auto-delegates matching tasks to this agent |
| `mcp-servers` | object | No | MCP server connections specific to this agent |

The Markdown body below frontmatter defines the agent's behavior, expertise, and instructions (max 30,000 characters).

## Tool Aliases

All aliases are case-insensitive:

| Primary Alias | Compatible Aliases | Purpose |
|---------------|-------------------|---------|
| `execute` | `shell`, `Bash`, `powershell` | Execute shell commands |
| `read` | `Read`, `NotebookRead` | Read file contents |
| `edit` | `Edit`, `MultiEdit`, `Write`, `NotebookEdit` | Edit files |
| `search` | `Grep`, `Glob` | Search for files or text |
| `agent` | `custom-agent`, `Task` | Invoke other custom agents |
| `web` | `WebSearch`, `WebFetch` | Web access |
| `todo` | `TodoWrite` | Task list management |

### MCP Server Tool References

Reference specific tools from MCP servers using namespace prefix:

```yaml
tools: ["read", "edit", "custom-mcp/tool-1", "github/*"]
```

- `some-mcp-server/some-tool` — specific tool from a server
- `some-mcp-server/*` — all tools from a server
- `github/*` — all tools from built-in GitHub MCP

## MCP Servers in Agent Profiles

Define MCP connections in YAML frontmatter:

```yaml
mcp-servers:
  custom-mcp:
    type: "local"
    command: "some-command"
    args: ["--arg1", "--arg2"]
    tools: ["*"]
    env:
      ENV_VAR: ${{ secrets.MY_SECRET }}
```

### MCP Server Types

- `local` / `stdio` — starts local process, communicates via stdin/stdout
- `http` — Streamable HTTP transport
- `sse` — Legacy HTTP with Server-Sent Events (deprecated but supported)

### Environment Variable Syntax

Supported patterns for secrets and variables:

| Syntax | Example |
|--------|---------|
| `$VAR_NAME` | `$API_KEY` |
| `${VAR_NAME}` | `${API_KEY}` |
| `${VAR_NAME:-default}` | `${API_KEY:-fallback}` |
| `${{ secrets.VAR }}` | `${{ secrets.API_KEY }}` |
| `${{ vars.VAR }}` | `${{ vars.API_KEY }}` |

Secrets and variables are sourced from the "copilot" environment in repository settings.

## Example Agent Profiles

### Security Auditor (Read-Only)

```markdown
---
name: security-auditor
description: Checks code for security vulnerabilities. Use when security review, check, or audit is requested.
tools: ["read", "search"]
infer: true
---

You are a security specialist. Analyze code for:

- Exposed secrets or credentials
- Cross-site scripting (XSS) vulnerabilities
- SQL injection risks
- Vulnerable dependencies
- Authentication bypass opportunities

For each issue, report: severity level, file and line, description, and recommended fix.
Never modify code — only report findings.
```

### Test Specialist (All Tools)

```markdown
---
name: test-specialist
description: Focuses on test coverage, quality, and testing best practices without modifying production code
---

You are a testing specialist focused on improving code quality through comprehensive testing.

- Analyze existing tests and identify coverage gaps
- Write unit, integration, and end-to-end tests
- Review test quality and suggest improvements
- Ensure tests are isolated, deterministic, and documented
- Focus only on test files — avoid modifying production code unless specifically requested
```

### Implementation Planner (Limited Tools)

```markdown
---
name: implementation-planner
description: Creates detailed implementation plans and technical specifications in markdown format
tools: ["read", "search", "edit"]
---

You are a technical planning specialist. Create comprehensive implementation plans with:

- Requirement analysis and task breakdowns
- Technical specifications and architecture docs
- Clear steps, dependencies, and acceptance criteria
- Testing, deployment, and risk considerations
```

## CLI Commands

| Action | Command |
|--------|---------|
| List/select agents interactively | `/agent` |
| Create a new agent | `/agent` → Create new agent |
| Use agent via CLI flag | `copilot --agent NAME --prompt "task"` |
| Use agent via prompt | `Use the NAME agent on ...` |

## Naming Conventions

- Agent file: `kebab-case-name.agent.md`
- The file name (minus `.agent.md`) becomes the agent ID
- The `name` field in frontmatter is the display name
- For programmatic use, use lowercase names with hyphens
