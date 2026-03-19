# Plugin & Marketplace Reference

Full reference for plugin.json, marketplace.json, and plugin management in GitHub Copilot CLI.

## plugin.json Schema

The manifest file at the root of a plugin directory.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Kebab-case plugin name (letters, numbers, hyphens only). Max 64 chars. |

### Optional Metadata Fields

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | Brief description. Max 1024 chars. |
| `version` | string | Semantic version (e.g., `1.0.0`). |
| `author` | object | `{ name (required), email?, url? }` |
| `homepage` | string | Plugin homepage URL. |
| `repository` | string | Source repository URL. |
| `license` | string | License identifier (e.g., `MIT`). |
| `keywords` | string[] | Search keywords. |
| `category` | string | Plugin category. |
| `tags` | string[] | Additional tags. |

### Component Path Fields

These tell the CLI where to find plugin components. All are optional with default conventions.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `agents` | string \| string[] | `agents/` | Path(s) to agent directories (`.agent.md` files) |
| `skills` | string \| string[] | `skills/` | Path(s) to skill directories (`SKILL.md` files) |
| `commands` | string \| string[] | — | Path(s) to command directories |
| `hooks` | string \| object | — | Path to hooks config file, or inline hooks object |
| `mcpServers` | string \| object | — | Path to MCP config file (e.g., `.mcp.json`), or inline server defs |
| `lspServers` | string \| object | — | Path to LSP config file, or inline server defs |

### Example

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

## Plugin Directory Structure

```
my-plugin/
├── plugin.json           # Required manifest
├── agents/               # Custom agents (optional)
│   └── helper.agent.md
├── skills/               # Skills (optional)
│   └── deploy/
│       └── SKILL.md
├── hooks.json            # Hook configuration (optional)
├── .mcp.json             # MCP server config (optional)
└── lsp.json              # LSP server config (optional)
```

### Manifest File Locations

The CLI searches for `plugin.json` in these locations:
- Plugin root directory
- `.github/plugin/plugin.json`
- `.claude-plugin/plugin.json`

## marketplace.json Schema

### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Kebab-case marketplace name. Max 64 chars. |
| `owner` | object | Yes | `{ name, email? }` — marketplace owner info. |
| `plugins` | array | Yes | List of plugin entries. |
| `metadata` | object | No | `{ description?, version?, pluginRoot? }` |

### Plugin Entry Fields

Each object in the `plugins` array:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Kebab-case plugin name. Max 64 chars. |
| `source` | string \| object | Yes | Relative path, GitHub ref, or URL. |
| `description` | string | No | Plugin description. Max 1024 chars. |
| `version` | string | No | Plugin version. |
| `author` | object | No | `{ name, email?, url? }` |
| `homepage` | string | No | Plugin homepage URL. |
| `repository` | string | No | Source repository URL. |
| `license` | string | No | License identifier. |
| `keywords` | string[] | No | Search keywords. |
| `category` | string | No | Plugin category. |
| `tags` | string[] | No | Additional tags. |
| `strict` | boolean | No | Default `true`. Set `false` for relaxed validation. |

### Example

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
    },
    {
      "name": "security-checks",
      "description": "Check for potential security vulnerabilities",
      "version": "1.3.0",
      "source": "./plugins/security-checks"
    }
  ]
}
```

### Marketplace File Location

Store at `.github/plugin/marketplace.json` or `.claude-plugin/marketplace.json` in the repository.

## Install Specification Formats

| Format | Example | Description |
|--------|---------|-------------|
| Marketplace | `plugin@marketplace` | Plugin from registered marketplace |
| GitHub root | `OWNER/REPO` | Root of GitHub repository |
| GitHub subdir | `OWNER/REPO:PATH/TO/PLUGIN` | Subdirectory in a repository |
| Git URL | `https://github.com/o/r.git` | Any Git URL |
| Local path | `./my-plugin` or `/abs/path` | Local directory |

## CLI Commands Reference

### Plugin Management

```
copilot plugin install SPEC         # Install a plugin
copilot plugin uninstall NAME       # Remove (use plugin name, not path)
copilot plugin list                 # List installed plugins
copilot plugin update NAME          # Update a plugin
copilot plugin update --all         # Update all plugins
copilot plugin disable NAME         # Temporarily disable
copilot plugin enable NAME          # Re-enable
```

### Marketplace Management

```
copilot plugin marketplace add OWNER/REPO        # Register from GitHub
copilot plugin marketplace add /PATH/TO/DIR       # Register from local path
copilot plugin marketplace add https://url.git    # Register from Git URL
copilot plugin marketplace list                   # List registered
copilot plugin marketplace browse NAME            # Browse plugins
copilot plugin marketplace remove NAME            # Unregister
copilot plugin marketplace remove NAME --force    # Unregister + uninstall plugins
```

### Interactive Session Commands

```
/plugin install SPEC
/plugin list
/plugin marketplace list
/plugin marketplace add OWNER/REPO
/plugin marketplace remove NAME
```

## Storage Locations

| Item | Path |
|------|------|
| Installed (via marketplace) | `~/.copilot/state/installed-plugins/MARKETPLACE/PLUGIN-NAME/` |
| Installed (direct) | `~/.copilot/state/installed-plugins/PLUGIN-NAME/` |
| Marketplace cache | `~/.copilot/state/marketplace-cache/` |

## Default Marketplaces

These are registered by default:
- `copilot-plugins` — [github/copilot-plugins](https://github.com/github/copilot-plugins)
- `awesome-copilot` — [github/awesome-copilot](https://github.com/github/awesome-copilot)

Additional community marketplaces:
- `claude-code-plugins` — [anthropics/claude-code](https://github.com/anthropics/claude-code)
- `claudeforge-marketplace` — [claudeforge/marketplace](https://github.com/claudeforge/marketplace)

## Loading Order & Precedence

### Agents & Skills — First-Found-Wins
Project-level agents/skills override plugin-provided ones with the same name. Agents are deduplicated by file name (minus `.agent.md`). Skills are deduplicated by the `name` field in `SKILL.md`.

### MCP Servers — Last-Wins
Plugin MCP configs override user-level configs. The `--additional-mcp-config` flag has highest priority.

### Caching
Plugin components are cached after install. To pick up changes to a local plugin, reinstall:

```bash
copilot plugin install ./my-plugin
```
