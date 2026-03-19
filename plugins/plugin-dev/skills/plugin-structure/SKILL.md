---
description: This skill should be used when the user asks to "create a plugin", "scaffold a plugin", "understand plugin structure", "organize plugin components", "add skills/agents/hooks", "configure auto-discovery", or needs guidance on plugin directory layout, component organization, file naming conventions, or Copilot CLI plugin architecture best practices.
version: 0.1.0
---

# Plugin Structure for Copilot CLI

## Overview

Copilot CLI plugins follow a directory-based convention with automatic component discovery. No manifest file is required. Understanding this structure enables creating well-organized, maintainable plugins that integrate seamlessly with Copilot CLI.

**Key concepts:**
- Convention-based directory layout for automatic discovery
- Component-based organization (skills, agents, hooks, extensions)
- Relative path references
- Auto-discovered component loading

## Directory Structure

Every Copilot CLI plugin follows this organizational pattern:

```
plugin-name/
├── skills/                   # Skills (files or subdirectories with SKILL.md)
│   └── skill-name/
│       └── SKILL.md         # Required for rich skills
├── agents/                   # Agent definitions (.agent.md files)
├── hooks/
│   └── hooks.json           # Event handler configuration
├── extensions/              # Extensions
└── README.md
```

**Critical rules:**

1. **No manifest file**: Copilot CLI plugins use directory conventions, not a `plugin.json` manifest
2. **Component locations**: All component directories (skills, agents, hooks) MUST be at plugin root level
3. **Optional components**: Only create directories for components the plugin actually uses
4. **Naming convention**: Use kebab-case for all directory and file names

## Component Organization

### Skills

**Location**: `skills/` directory
**Format**: `.md` files (simple) or subdirectories with `SKILL.md` (rich skills)
**Auto-discovery**: All skill files and `SKILL.md` files load automatically

**Example structure**:
```
skills/
├── quick-lint.md             # Simple skill (single file)
├── api-testing/              # Rich skill (directory)
│   ├── SKILL.md
│   ├── scripts/
│   │   └── test-runner.py
│   └── references/
│       └── api-spec.md
└── database-migrations/
    ├── SKILL.md
    └── examples/
        └── migration-template.sql
```

**SKILL.md format**:
```markdown
---
description: When to use this skill
version: 1.0.0
---

Skill instructions and guidance...
```

**Supporting files**: Skills can include scripts, references, examples, or assets in subdirectories

**Usage**: Copilot CLI autonomously activates skills based on task context matching the description

### Agents

**Location**: `agents/` directory
**Format**: Markdown files with `.agent.md` extension and YAML frontmatter
**Auto-discovery**: All `.agent.md` files in `agents/` load automatically

**Example structure**:
```
agents/
├── code-reviewer.agent.md
├── test-generator.agent.md
└── refactorer.agent.md
```

**File format**:
```markdown
---
description: Agent role and expertise
tools: [read, edit, grep]
---

Detailed agent instructions and knowledge...
```

**Usage**: Users can invoke agents manually, or Copilot CLI selects them automatically based on task context

### Hooks

**Location**: `hooks/hooks.json`
**Format**: JSON configuration defining event handlers
**Registration**: Hooks register automatically when plugin enables

**Example structure**:
```
hooks/
├── hooks.json           # Hook configuration
└── scripts/
    ├── validate.sh      # Hook script
    └── check-style.sh   # Hook script
```

**Configuration format**:
```json
{
  "preToolUse": [{
    "matcher": "create|edit",
    "hooks": [{
      "type": "command",
      "command": "bash ./hooks/scripts/validate.sh",
      "timeout": 30
    }]
  }]
}
```

**Available events**: preToolUse, postToolUse, agentStop, subagentStop, sessionStart, sessionEnd, userPromptSubmitted, preCompact, notification

**Usage**: Hooks execute automatically in response to Copilot CLI events

### MCP Servers

**Location**: `.mcp.json` at plugin root
**Format**: JSON configuration for MCP server definitions
**Auto-start**: Servers start automatically when plugin enables

**Example format**:
```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["./servers/server.js"],
      "env": {
        "API_KEY": "${API_KEY}"
      }
    }
  }
}
```

**Usage**: MCP servers integrate seamlessly with Copilot CLI's tool system

## Path References

### Relative Paths

Use relative paths from the plugin root for all intra-plugin path references:

```json
{
  "command": "bash ./scripts/run.sh"
}
```

**Why it matters**: Plugins install in different locations depending on:
- User installation method
- Operating system conventions
- User preferences

**Where to use**:
- Hook command paths
- MCP server command arguments
- Script execution references
- Resource file paths

**Never use**:
- Hardcoded absolute paths (`/Users/name/plugins/...`)
- Home directory shortcuts (`~/plugins/...`)

### Environment Variables

Available in hook scripts:

| Variable | Description |
|----------|-------------|
| `$PLUGIN_DIR` | Absolute path to the plugin root |
| `$PROJECT_DIR` | Absolute path to the current project |
| `$ENV_FILE` | Path to the environment file |

**In hook command paths** (hooks.json):
```json
"command": "bash ./scripts/tool.sh"
```

**In component files** (skills, agents):
```markdown
Reference scripts at: ./scripts/helper.py
```

**In executed scripts**:
```bash
#!/bin/bash
# $PLUGIN_DIR available as environment variable
source "$PLUGIN_DIR/lib/common.sh"
```

## File Naming Conventions

### Component Files

**Skills**: Use kebab-case `.md` files or directories
- `lint.md` (simple skill)
- `api-testing/SKILL.md` (rich skill)

**Agents**: Use kebab-case `.agent.md` files describing role
- `test-generator.agent.md`
- `code-reviewer.agent.md`
- `performance-analyzer.agent.md`

**Skills directories**: Use kebab-case directory names
- `api-testing/`
- `database-migrations/`
- `error-handling/`

### Supporting Files

**Scripts**: Use descriptive kebab-case names with appropriate extensions
- `validate-input.sh`
- `generate-report.py`
- `process-data.js`

**Documentation**: Use kebab-case markdown files
- `api-reference.md`
- `migration-guide.md`
- `best-practices.md`

**Configuration**: Use standard names
- `hooks.json`
- `.mcp.json`

## Auto-Discovery Mechanism

Copilot CLI automatically discovers and loads components:

1. **Plugin directory**: Scans plugin root for recognized directories
2. **Skills**: Scans `skills/` for `.md` files and subdirectories with `SKILL.md`
3. **Agents**: Scans `agents/` directory for `.agent.md` files
4. **Hooks**: Loads configuration from `hooks/hooks.json`
5. **MCP servers**: Loads configuration from `.mcp.json`

**Discovery timing**:
- Plugin installation: Components register with Copilot CLI
- Plugin enable: Components become available for use
- No restart required: Changes take effect on next Copilot CLI session

## Best Practices

### Organization

1. **Logical grouping**: Group related components together
   - Put test-related skills and agents together
   - Create subdirectories in `scripts/` for different purposes

2. **Minimal structure**: Only create directories you need
   - Rely on auto-discovery for standard layouts
   - Start simple, add structure as the plugin grows

3. **Documentation**: Include README files
   - Plugin root: Overall purpose and usage
   - Component directories: Specific guidance
   - Script directories: Usage and requirements

### Naming

1. **Consistency**: Use consistent naming across components
   - Match skill directory names to their purpose
   - Use descriptive agent names

2. **Clarity**: Use descriptive names that indicate purpose
   - Good: `api-integration-testing/`, `code-quality-checker.md`
   - Avoid: `utils/`, `misc.md`, `temp.sh`

3. **Length**: Balance brevity with clarity
   - Skills: Topic-focused (`error-handling`, `api-design`)
   - Agents: Describe role clearly (`code-reviewer.agent.md`, `test-generator.agent.md`)

### Portability

1. **Use relative paths**: Never hardcode absolute paths
2. **Test on multiple systems**: Verify on macOS, Linux, Windows
3. **Document dependencies**: List required tools and versions
4. **Avoid system-specific features**: Use portable bash/Python constructs

### Maintenance

1. **Deprecate gracefully**: Mark old components clearly before removal
2. **Document breaking changes**: Note changes affecting existing users
3. **Test thoroughly**: Verify all components work after changes

## Common Patterns

### Minimal Plugin

Single skill with no dependencies:
```
my-plugin/
└── skills/
    └── hello.md           # Single skill
```

### Full-Featured Plugin

Complete plugin with all component types:
```
my-plugin/
├── skills/            # Skills
├── agents/            # Specialized agents
├── hooks/             # Event handlers
│   ├── hooks.json
│   └── scripts/
├── .mcp.json          # External integrations
└── scripts/           # Shared utilities
```

### Skill-Focused Plugin

Plugin providing only skills:
```
my-plugin/
└── skills/
    ├── skill-one/
    │   └── SKILL.md
    └── skill-two/
        └── SKILL.md
```

## Troubleshooting

**Component not loading**:
- Verify file is in correct directory with correct extension
- Check YAML frontmatter syntax (agents, skills)
- Ensure rich skills have `SKILL.md` (not `README.md` or other name)
- Ensure agent files use `.agent.md` extension
- Confirm plugin is enabled in Copilot CLI settings

**Path resolution errors**:
- Use relative paths from plugin root (`./scripts/run.sh`)
- Check that referenced files exist at specified paths
- Test with `echo $PLUGIN_DIR` in hook scripts

**Auto-discovery not working**:
- Confirm directories are at plugin root level
- Check file naming follows conventions (kebab-case, correct extensions)
- Restart Copilot CLI to reload plugin configuration

**Conflicts between plugins**:
- Use unique, descriptive component names
- Document potential conflicts in plugin README
- Consider name prefixes for related functionality

---

For detailed examples and advanced patterns, see files in `references/` and `examples/` directories.