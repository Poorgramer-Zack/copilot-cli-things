# copilot-cli-things

A curated collection of plugins and extensions for [GitHub Copilot CLI](https://docs.github.com/copilot/concepts/agents/about-copilot-cli).

## Extensions

Extensions are Node.js processes that add custom tools, hooks, and event-driven behaviors to Copilot CLI via the `@github/copilot-sdk`.

| Extension | Description |
|-----------|-------------|
| [cron-task](extensions/cron-task/) | Schedule recurring tasks — shell commands or agent prompts on a timer |
| [phase-router](extensions/phase-router/) | LLM-driven intent detection + intelligent model switching |

### Install an Extension

Copy the extension directory to either location:

```bash
# Project-level
cp -r extensions/<name> your-project/.github/extensions/

# User-level (all projects)
cp -r extensions/<name> ~/.copilot/extensions/
```

Restart Copilot CLI or run `/clear` to load.

## Plugins

Plugins bundle agents, skills, hooks, and MCP configs into distributable packages.

### Install from This Marketplace

```bash
# Register this marketplace
copilot plugin marketplace add Poorgramer-Zack/copilot-cli-things

# Browse available plugins
copilot plugin marketplace browse copilot-cli-things

# Install a plugin
copilot plugin install <plugin-name>@copilot-cli-things
```

## Contributing

### Add an Extension

1. Create a directory under `extensions/<name>/`
2. Add `extension.mjs` (entry point) and `README.md`
3. Submit a PR

### Add a Plugin

1. Create a directory under `plugins/<name>/`
2. Add `plugin.json` manifest and plugin components (agents, skills, hooks, etc.)
3. Register it in `.github/plugin/marketplace.json`
4. Submit a PR

## License

[MIT](LICENSE)
