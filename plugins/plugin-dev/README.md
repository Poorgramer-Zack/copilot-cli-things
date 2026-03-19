# Plugin Development Toolkit

A comprehensive toolkit for developing Copilot CLI plugins with expert guidance on hooks, MCP integration, plugin structure, and distribution.

## Overview

The plugin-dev toolkit provides eight specialized skills to help you build high-quality Copilot CLI plugins:

1. **Hook Development** - Advanced hooks API and event-driven automation
2. **MCP Integration** - Model Context Protocol server integration
3. **Plugin Structure** - Plugin organization and directory layout
4. **Plugin Settings** - Configuration patterns using .github/plugin-name.local.md files
5. **Skill & Agent Development** - Creating skills, agents (.agent.md), and extensions
6. **Agent Development** - Creating autonomous agents with AI-assisted generation
7. **Skill Development** - Creating skills with progressive disclosure and strong triggers
8. **Create Plugin** - Guided workflow for end-to-end plugin creation

Each skill follows best practices with progressive disclosure: lean core documentation, detailed references, working examples, and utility scripts.

## Guided Workflow

### create-plugin skill

A comprehensive, end-to-end workflow skill for creating plugins from scratch, similar to the feature-dev workflow.

**8-Phase Process:**
1. **Discovery** - Understand plugin purpose and requirements
2. **Component Planning** - Determine needed skills, agents, hooks, MCP, extensions
3. **Detailed Design** - Specify each component and resolve ambiguities
4. **Structure Creation** - Set up directories and layout
5. **Component Implementation** - Create each component using AI-assisted agents
6. **Validation** - Run plugin-validator and component-specific checks
7. **Testing** - Verify plugin works in Copilot CLI
8. **Documentation** - Finalize README and prepare for distribution

**Features:**
- Asks clarifying questions at each phase
- Loads relevant skills automatically
- Uses agent-creator for AI-assisted agent generation
- Runs validation utilities (validate-agent.sh, validate-hook-schema.sh, etc.)
- Follows plugin-dev's own proven patterns
- Guides through testing and verification

**Usage:**
```bash
# Invoke the create-plugin skill by asking Copilot:
"create a new plugin"
"create a plugin for managing database migrations"
```

Use this workflow for structured, high-quality plugin development from concept to completion.

## Skills

### 1. Hook Development

**Trigger phrases:** "create a hook", "add a preToolUse hook", "validate tool use", "implement prompt-based hooks", "block dangerous commands"

**What it covers:**
- Prompt-based hooks (recommended) with LLM decision-making
- Command hooks for deterministic validation
- All hook events: preToolUse, postToolUse, agentStop, subagentStop, sessionStart, sessionEnd, userPromptSubmit, preCompact, notification
- Hook output formats and JSON schemas
- Security best practices and input validation
- Relative path references for portable paths

**Resources:**
- Core SKILL.md (1,619 words)
- 3 example hook scripts (validate-write, validate-bash, load-context)
- 3 reference docs: patterns, migration, advanced techniques
- 3 utility scripts: validate-hook-schema.sh, test-hook.sh, hook-linter.sh

**Use when:** Creating event-driven automation, validating operations, or enforcing policies in your plugin.

### 2. MCP Integration

**Trigger phrases:** "add MCP server", "integrate MCP", "configure .mcp.json", "Model Context Protocol", "stdio/SSE/HTTP server", "connect external service"

**What it covers:**
- MCP server configuration (mcp.json vs plugin config)
- All server types: stdio (local), SSE (hosted/OAuth), HTTP (REST), WebSocket (real-time)
- Environment variable expansion and relative paths
- MCP tool naming and usage in skills/agents
- Authentication patterns: OAuth, tokens, env vars
- Integration patterns and performance optimization

**Resources:**
- Core SKILL.md (1,666 words)
- 3 example configurations (stdio, SSE, HTTP)
- 3 reference docs: server-types (~3,200w), authentication (~2,800w), tool-usage (~2,600w)

**Use when:** Integrating external services, APIs, databases, or tools into your plugin.

### 3. Plugin Structure

**Trigger phrases:** "plugin structure", "plugin layout", "auto-discovery", "component organization", "plugin directory layout"

**What it covers:**
- Standard plugin directory structure and auto-discovery
- Plugin layout with skills/, agents/, hooks/, extensions/ directories
- Component organization (skills, agents, hooks, extensions)
- Relative path usage throughout
- File naming conventions and best practices
- Minimal, standard, and advanced plugin patterns

**Resources:**
- Core SKILL.md (1,619 words)
- 3 example structures (minimal, standard, advanced)
- 2 reference docs: component-patterns, manifest-reference

**Use when:** Starting a new plugin, organizing components, or configuring the plugin manifest.

### 4. Plugin Settings

**Trigger phrases:** "plugin settings", "store plugin configuration", ".local.md files", "plugin state files", "read YAML frontmatter", "per-project plugin settings"

**What it covers:**
- .github/plugin-name.local.md pattern for configuration
- YAML frontmatter + markdown body structure
- Parsing techniques for bash scripts (sed, awk, grep patterns)
- Temporarily active hooks (flag files and quick-exit)
- Real-world examples from multi-agent-swarm and ralph-wiggum plugins
- Atomic file updates and validation
- Gitignore and lifecycle management

**Resources:**
- Core SKILL.md (1,623 words)
- 3 examples (read-settings hook, create-settings command, templates)
- 2 reference docs: parsing-techniques, real-world-examples
- 2 utility scripts: validate-settings.sh, parse-frontmatter.sh

**Use when:** Making plugins configurable, storing per-project state, or implementing user preferences.

### 5. Skill & Agent Development

**Trigger phrases:** "create a skill", "add an agent", "skill frontmatter", "define agent arguments", "organize skills and agents"

**What it covers:**
- Skill structure and markdown format
- Agent files with .agent.md extension
- YAML frontmatter fields (description, allowed-tools)
- Dynamic arguments and file references
- Bash execution for context
- Skill and agent organization and namespacing
- Best practices for component development

**Resources:**
- Core SKILL.md (1,535 words)
- Examples and reference documentation
- Skill and agent organization patterns

**Use when:** Creating skills, defining agent files (.agent.md), or organizing plugin components.

### 6. Agent Development

**Trigger phrases:** "create an agent", "add an agent", "write a subagent", "agent frontmatter", "when to use description", "agent examples", "autonomous agent", ".agent.md"

**What it covers:**
- Agent file structure (.agent.md with YAML frontmatter + system prompt)
- All frontmatter fields (name, description, model, color, tools)
- Description format with <example> blocks for reliable triggering
- System prompt design patterns (analysis, generation, validation, orchestration)
- AI-assisted agent generation using Copilot's proven prompt
- Validation rules and best practices
- Complete production-ready agent examples

**Resources:**
- Core SKILL.md (1,438 words)
- 2 examples: agent-creation-prompt (AI-assisted workflow), complete-agent-examples (4 full agents)
- 3 reference docs: agent-creation-system-prompt (from Copilot), system-prompt-design (~4,000w), triggering-examples (~2,500w)
- 1 utility script: validate-agent.sh

**Use when:** Creating autonomous agents, defining agent behavior, or implementing AI-assisted agent generation.

### 7. Skill Development

**Trigger phrases:** "create a skill", "add a skill to plugin", "write a new skill", "improve skill description", "organize skill content"

**What it covers:**
- Skill structure (SKILL.md with YAML frontmatter)
- Progressive disclosure principle (metadata → SKILL.md → resources)
- Strong trigger descriptions with specific phrases
- Writing style (imperative/infinitive form, third person)
- Bundled resources organization (references/, examples/, scripts/)
- Skill creation workflow
- Based on skill-creator methodology adapted for Copilot CLI plugins

**Resources:**
- Core SKILL.md (1,232 words)
- References: skill-creator methodology, plugin-dev patterns
- Examples: Study plugin-dev's own skills as templates

**Use when:** Creating new skills for plugins or improving existing skill quality.


## Installation

Install via Copilot CLI:

```bash
/plugin install plugin-dev
```

Or for development, add the plugin directory to your Copilot CLI configuration.

## Quick Start

### Creating Your First Plugin

1. **Plan your plugin structure:**
   - Ask: "What's the best directory structure for a plugin with commands and MCP integration?"
   - The plugin-structure skill will guide you

2. **Add MCP integration (if needed):**
   - Ask: "How do I add an MCP server for database access?"
   - The mcp-integration skill provides examples and patterns

3. **Implement hooks (if needed):**
   - Ask: "Create a preToolUse hook that validates file writes"
   - The hook-development skill gives working examples and utilities


## Development Workflow

The plugin-dev toolkit supports your entire plugin development lifecycle:

```
┌─────────────────────┐
│  Design Structure   │  → plugin-structure skill
│  (layout, dirs)     │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Add Components     │
│  (skills, agents,   │  → All skills provide guidance
│   hooks, extensions)│
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Integrate Services │  → mcp-integration skill
│  (MCP servers)      │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Add Automation     │  → hook-development skill
│  (hooks, validation)│     + utility scripts
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Test & Validate    │  → hook-development utilities
│                     │     validate-hook-schema.sh
└──────────┬──────────┘     test-hook.sh
           │                 hook-linter.sh
```

## Features

### Progressive Disclosure

Each skill uses a three-level disclosure system:
1. **Metadata** (always loaded): Concise descriptions with strong triggers
2. **Core SKILL.md** (when triggered): Essential API reference (~1,500-2,000 words)
3. **References/Examples** (as needed): Detailed guides, patterns, and working code

This keeps Copilot CLI's context focused while providing deep knowledge when needed.

### Utility Scripts

The hook-development skill includes production-ready utilities:

```bash
# Validate hooks.json structure
./validate-hook-schema.sh hooks/hooks.json

# Test hooks before deployment
./test-hook.sh my-hook.sh test-input.json

# Lint hook scripts for best practices
./hook-linter.sh my-hook.sh
```

### Working Examples

Every skill provides working examples:
- **Hook Development**: 3 complete hook scripts (bash, write validation, context loading)
- **MCP Integration**: 3 server configurations (stdio, SSE, HTTP)
- **Plugin Structure**: 3 plugin layouts (minimal, standard, advanced)
- **Plugin Settings**: 3 examples (read-settings hook, create-settings command, templates)
- **Command Development**: 10 complete skill and agent examples (review, test, deploy, docs, etc.)

## Documentation Standards

All skills follow consistent standards:
- Third-person descriptions ("This skill should be used when...")
- Strong trigger phrases for reliable loading
- Imperative/infinitive form throughout
- Based on official Copilot CLI documentation
- Security-first approach with best practices

## Total Content

- **Core Skills**: ~11,065 words across 8 SKILL.md files
- **Reference Docs**: ~10,000+ words of detailed guides
- **Examples**: 12+ working examples (hook scripts, MCP configs, plugin layouts, settings files)
- **Utilities**: 6 production-ready validation/testing/parsing scripts

## Use Cases

### Building a Database Plugin

```
1. "What's the structure for a plugin with MCP integration?"
   → plugin-structure skill provides layout

2. "How do I configure an stdio MCP server for PostgreSQL?"
   → mcp-integration skill shows configuration

3. "Add an agentStop hook to ensure connections close properly"
   → hook-development skill provides pattern

```

### Creating a Validation Plugin

```
1. "Create hooks that validate all file writes for security"
   → hook-development skill with examples

2. "Test my hooks before deploying"
   → Use validate-hook-schema.sh and test-hook.sh

3. "Organize my hooks and configuration files"
   → plugin-structure skill shows best practices

```

### Integrating External Services

```
1. "Add Asana MCP server with OAuth"
   → mcp-integration skill covers SSE servers

2. "Use Asana tools in my skills"
   → mcp-integration tool-usage reference

3. "Structure my plugin with skills and MCP"
   → plugin-structure skill provides patterns
```

## Best Practices

All skills emphasize:

✅ **Security First**
- Input validation in hooks
- HTTPS/WSS for MCP servers
- Environment variables for credentials
- Principle of least privilege

✅ **Portability**
- Use relative paths everywhere
- Environment variable substitution

✅ **Testing**
- Validate configurations before deployment
- Test hooks with sample inputs
- Use debug mode (`copilot --debug`)

✅ **Documentation**
- Clear README files
- Documented environment variables
- Usage examples

## Contributing

This plugin is part of the Copilot CLI plugin ecosystem. To contribute improvements:

1. Fork the repository
2. Make changes to plugin-dev/
3. Test locally with your Copilot CLI configuration
4. Create PR following contribution guidelines

## Version

0.1.0 - Initial release with eight comprehensive skills and three validation agents

## Author

Daisy Hollman (daisy@anthropic.com)

## License

MIT License - See repository for details

---

**Note:** This toolkit is designed to help you build high-quality Copilot CLI plugins. The skills load automatically when you ask relevant questions, providing expert guidance exactly when you need it.
