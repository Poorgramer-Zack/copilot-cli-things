# copilot-cli-things

A curated collection of extensions, skills, and plugins for [GitHub Copilot CLI](https://docs.github.com/copilot/concepts/agents/about-copilot-cli).

## Extensions

Extensions are Node.js processes that add custom tools, hooks, and event-driven behaviors to Copilot CLI via the `@github/copilot-sdk`.

| Extension | Description |
|-----------|-------------|
| [cron-task](extensions/cron-task/) | Schedule recurring tasks — shell commands or agent prompts on a timer |
| [phase-router](extensions/phase-router/) | LLM-driven intent detection + intelligent model switching |
| [fleet-worktree](extensions/fleet-worktree/) | Git worktree management for fleet mode — isolated branches per parallel task |

### Install an Extension

Copy the extension directory to either location:

```bash
# Project-level
cp -r extensions/<name> your-project/.github/extensions/

# User-level (all projects)
cp -r extensions/<name> ~/.copilot/extensions/
```

Restart Copilot CLI or run `/clear` to load.

## Skills

All skills are distributed as plugins via this marketplace.

## Plugins

Plugins bundle agents, skills, hooks, and MCP configs into distributable packages.

| Plugin | Category | Description |
|--------|----------|-------------|
| [hookify](plugins/hookify/) | safety | Markdown-based hook creation — regex patterns with warn/block actions |
| [plugin-dev](plugins/plugin-dev/) | development | Plugin development toolkit — hooks, MCP, agents, settings, structure |
| [copilot-cli-configurator](plugins/copilot-cli-configurator/) | configuration | Configure custom instructions, hooks, MCP servers, agents, plugins, extensions |
| [create-extension](plugins/create-extension/) | development | Build extensions — SDK API, tools, hooks, events, JSON-RPC lifecycle |
| [mcp-builder](plugins/mcp-builder/) | development | Build and test MCP servers in TypeScript or Python |
| [skill-creator](plugins/skill-creator/) | development | Skill development lifecycle — create, test, benchmark, optimize |

### Install from This Marketplace

```bash
# Register the marketplace
copilot plugin marketplace add pgZack/copilot-cli-things

# Browse available plugins
copilot plugin marketplace browse copilot-cli-things

# Install a plugin
copilot plugin install hookify@copilot-cli-things
```

## Contributing

### Add an Extension

1. Create a directory under `extensions/<name>/`
2. Add `extension.mjs` (entry point) and `README.md`
3. Submit a PR

### Add a Plugin

1. Create a directory under `plugins/<name>/`
2. Add plugin components in conventionally named subdirectories (`agents/`, `skills/`, `hooks/`, `mcp/`, etc.)
3. Add a `README.md` describing the plugin
4. Submit a PR

## License

[MIT](LICENSE)
