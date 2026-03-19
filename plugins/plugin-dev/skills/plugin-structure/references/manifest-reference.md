# Plugin Structure Reference

Complete reference for Copilot CLI plugin directory structure.

## Overview

Copilot CLI plugins use a **directory-based convention** — no manifest file is required. The plugin structure is discovered automatically based on well-known directory names and file patterns.

## Plugin Root

A plugin is any directory that contains one or more of the recognized component directories:

```
my-plugin/
├── skills/       # Skill definitions
├── agents/       # Agent definitions
├── hooks/        # Hook configurations
├── extensions/   # Extension modules
├── scripts/      # Shared scripts
├── lib/          # Shared libraries
├── config/       # Configuration files
├── servers/      # MCP server implementations
└── .mcp.json     # MCP server configuration
```

No directory is required — include only what your plugin needs.

## Component Directories

### skills/

Contains skill definitions that provide knowledge, capabilities, and actions.

**Discovery rules**:
- `.md` files directly in `skills/` are treated as simple skills
- Subdirectories with a `SKILL.md` file are treated as rich skills
- Rich skills can include `references/`, `examples/`, `scripts/`, and `assets/` subdirectories

**Simple skill** (single file):

```
skills/
├── lint.md
├── test.md
└── deploy.md
```

**Rich skill** (directory with resources):

```
skills/
└── kubernetes-ops/
    ├── SKILL.md              # Required: skill definition
    ├── references/           # Optional: detailed guides
    │   ├── deployment.md
    │   └── troubleshooting.md
    ├── examples/             # Optional: code samples
    │   └── basic-deploy.yaml
    ├── scripts/              # Optional: executable scripts
    │   └── validate.sh
    └── assets/               # Optional: templates, configs
        └── template.json
```

**Skill frontmatter**:

```yaml
---
description: Brief description of what the skill does and when to use it
---
```

The `description` field is used by Copilot CLI to determine when to automatically load the skill based on task context.

### agents/

Contains agent definitions that provide specialized AI capabilities.

**Discovery rules**:
- Files must use the `.agent.md` extension
- Can be organized in subdirectories for categorization

**Flat structure**:

```
agents/
├── code-reviewer.agent.md
├── test-generator.agent.md
└── deployment-manager.agent.md
```

**Categorized structure**:

```
agents/
├── orchestration/
│   ├── deployment-orchestrator.agent.md
│   └── rollback-manager.agent.md
└── specialized/
    ├── kubernetes-expert.agent.md
    └── security-auditor.agent.md
```

**Agent frontmatter**:

```yaml
---
description: What the agent specializes in and when it should be selected
capabilities:
  - Capability one
  - Capability two
---
```

### hooks/

Contains hook configurations for event-driven automation.

**Required file**: `hooks/hooks.json`

**Structure**:

```
hooks/
├── hooks.json        # Hook definitions (required)
└── scripts/          # Hook scripts (optional)
    ├── validate.sh
    └── notify.sh
```

**hooks.json format**:

```json
{
  "preToolUse": [
    {
      "matcher": "create|edit",
      "hooks": [
        {
          "type": "command",
          "command": "bash ./hooks/scripts/validate.sh",
          "timeout": 30
        }
      ]
    }
  ],
  "agentStop": [
    {
      "matcher": ".*",
      "hooks": [
        {
          "type": "command",
          "command": "bash ./hooks/scripts/notify.sh",
          "timeout": 15
        }
      ]
    }
  ]
}
```

**Supported events**: `preToolUse`, `postToolUse`, `agentStop`, `subagentStop`, `userPromptSubmitted`, `sessionStart`, `sessionEnd`, `notification`, `preCompact`

**Hook types**:
- `command` — Execute a shell command
- `prompt` — Inject a prompt into the conversation

### extensions/

Contains modular feature extensions for the plugin.

```
extensions/
├── slack-integration/
│   ├── skills/
│   ├── hooks/
│   └── scripts/
└── monitoring/
    ├── skills/
    └── agents/
```

Each extension follows the same directory conventions as the root plugin.

### scripts/

Shared scripts used by skills, hooks, or agents.

```
scripts/
├── build.sh
├── validate.py
└── utils/
    ├── log.sh
    └── config.sh
```

**Path convention**: Reference scripts using relative paths from the plugin root:
```bash
bash ./scripts/build.sh
```

### lib/

Shared libraries and utility code.

```
lib/
├── core/
│   ├── logger.js
│   └── config.js
├── integrations/
│   ├── slack.js
│   └── datadog.js
└── utils/
    └── retry.js
```

### config/

Configuration files for different environments or features.

```
config/
├── environments/
│   ├── production.json
│   ├── staging.json
│   └── development.json
└── templates/
    └── deployment.yaml
```

## MCP Server Configuration

### .mcp.json

Located at the plugin root, defines MCP servers the plugin provides:

```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["./servers/my-server/index.js"],
      "env": {
        "API_KEY": "${API_KEY}"
      }
    }
  }
}
```

**Fields**:
- `command` — Executable to run
- `args` — Command-line arguments
- `env` — Environment variables (supports `${VAR}` expansion)

## Environment Variables

Available to hook scripts and commands at runtime:

| Variable | Description |
|----------|-------------|
| `$PLUGIN_DIR` | Absolute path to the plugin root directory |
| `$PROJECT_DIR` | Absolute path to the current project directory |
| `$ENV_FILE` | Path to the environment file for setting variables |

### Setting environment variables

Write to `$ENV_FILE` to set variables for the session:

```bash
echo "MY_VAR=value" >> "$ENV_FILE"
```

## Path Conventions

- All paths in hook commands are **relative to the plugin root**
- Use `./` prefix for clarity: `bash ./scripts/build.sh`
- Hook scripts receive the plugin root as their working directory
- Skills reference their own resources with relative paths

## Validation Rules

### Directory names

- Use lowercase with hyphens: `my-plugin/`, `code-quality/`
- Component directories must use exact names: `skills/`, `agents/`, `hooks/`, `extensions/`

### File naming

- Skill files: `*.md` (simple) or `SKILL.md` (rich skill directory)
- Agent files: `*.agent.md`
- Hook config: `hooks.json`
- Scripts: Use appropriate extension (`.sh`, `.py`, `.js`)

### Frontmatter

- Skill files must include `description` in YAML frontmatter
- Agent files must include `description` in YAML frontmatter
- The `description` field drives automatic discovery and selection

### Hook scripts

- Must be executable (`chmod +x`)
- Must output valid JSON to stdout for Copilot CLI to process
- Should respect the configured `timeout` value
- Exit code 0 indicates success; non-zero indicates failure

## Minimal Plugin

The simplest valid plugin:

```
my-plugin/
└── skills/
    └── hello.md
```

With content:

```markdown
---
description: Greets the user
---

Say hello to the user with a friendly message.
```

## Complete Plugin

A fully-featured plugin using all conventions:

```
my-plugin/
├── skills/
│   ├── quick-action.md
│   └── detailed-topic/
│       ├── SKILL.md
│       ├── references/
│       ├── examples/
│       └── scripts/
├── agents/
│   ├── specialist.agent.md
│   └── reviewer.agent.md
├── hooks/
│   ├── hooks.json
│   └── scripts/
│       ├── validate.sh
│       └── notify.sh
├── extensions/
│   └── optional-feature/
│       ├── skills/
│       └── hooks/
├── scripts/
│   └── shared-util.sh
├── lib/
│   └── helpers.js
├── config/
│   └── settings.json
├── servers/
│   └── custom-mcp/
│       └── index.js
└── .mcp.json
```
