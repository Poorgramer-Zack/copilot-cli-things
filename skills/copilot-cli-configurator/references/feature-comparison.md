# Feature Comparison Reference

Detailed comparison of GitHub Copilot CLI customization features.

## Decision Matrix

| Requirement | Best Option | Why |
|-------------|-------------|-----|
| Always follow repo conventions | Custom instructions | Loaded every session, low overhead |
| Repeatable workflow on demand | Skills | Triggered contextually, separate from base instructions |
| Guardrails / policy / automation | Hooks | Programmable control at lifecycle points |
| External tools and data sources | MCP servers | Standardized protocol for tool integration |
| Specialist persona, constrained tools | Custom agents | Subagent with own context window and toolset |
| Complex multi-step task delegation | Subagents | Copilot auto-delegates, keeps main context clean |
| Custom tools with dynamic logic | Extensions | Node.js process with full SDK access |
| Model switching, event reactions | Extensions | Programmatic session control via SDK |
| Bundle functionality to distribute | Plugins | Installable package with all components |

## Custom Instructions vs Skills

| Aspect | Custom Instructions | Skills |
|--------|-------------------|--------|
| Scope | Every task | Specific task types |
| Loading | Always loaded at session start | On-demand when relevant |
| Context cost | Consumes context on every prompt | Only when triggered |
| Complexity | Simple text guidance | Can include scripts, examples, assets |
| Best for | Coding standards, conventions | Specialized workflows, repeatable tasks |

## Skills vs Custom Agents

| Aspect | Skills | Custom Agents |
|--------|--------|---------------|
| Execution | Injected into current context | Runs as separate subagent |
| Context window | Shares main agent's context | Has own context window |
| Tool restrictions | Uses main agent's tools | Can restrict to specific tools |
| Complexity | Instructions + optional scripts | Full persona with behavior definition |
| Best for | "How to do X" instructions | "Be an X expert" specialization |

## Extensions vs Hooks

| Aspect | Extensions | Hooks (hooks.json) |
|--------|-----------|-------------------|
| Language | JavaScript (async functions) | Shell commands (bash/powershell) |
| Modify prompts | ✅ `modifiedPrompt` | ❌ |
| Modify tool args/results | ✅ Full control | ❌ |
| Permission control | ✅ `permissionDecision` | ❌ |
| Model switching | ✅ `session.setModel()` | ❌ |
| Event subscription | ✅ `session.on()` | ❌ |
| Runtime requirement | Node.js | System shell |
| Plugin-bundleable | ❌ Not yet | ✅ via hooks.json |

## Hooks vs Custom Instructions

| Aspect | Hooks | Custom Instructions |
|--------|-------|-------------------|
| Mechanism | Shell command execution | Text injected into prompts |
| Guarantee | Deterministic — runs every time | Probabilistic — guidance, not enforcement |
| Use case | Enforce policy, log, block actions | Guide behavior, set preferences |
| Scope | Lifecycle events | All interactions |

## MCP Servers vs Built-in Tools

| Aspect | MCP Servers | Built-in Tools |
|--------|------------|----------------|
| Scope | External services, APIs, databases | File system, shell, GitHub |
| Setup | Requires configuration | Always available |
| Protocol | Standardized MCP | Native CLI integration |
| Best for | Integration with external systems | Standard development tasks |

## Plugins vs Manual Configuration

| Aspect | Plugins | Manual Config |
|--------|---------|---------------|
| Scope | Any project | Single repository |
| Sharing | `copilot plugin install` | Manual copy/paste |
| Versioning | Marketplace versions | Git history |
| Discovery | Marketplace browsing | Searching repos |
| Components | Bundles agents, skills, hooks, MCP | Individual files |

## File Location Summary

| Component | Project Location | User Location |
|-----------|-----------------|---------------|
| Custom instructions | `.github/copilot-instructions.md` | `~/.copilot/copilot-instructions.md` |
| Path-specific instructions | `.github/instructions/*.instructions.md` | — |
| Agent instructions | `AGENTS.md` (repo root) | `AGENTS.md` in `COPILOT_CUSTOM_INSTRUCTIONS_DIRS` |
| Skills | `.github/skills/` or `.claude/skills/` | `~/.copilot/skills/` or `~/.claude/skills/` |
| Custom agents | `.github/agents/` | `~/.copilot/agents/` |
| Extensions | `.github/extensions/<name>/extension.mjs` | `~/.copilot/extensions/<name>/extension.mjs` |
| Hooks | `.github/hooks/hooks.json` | — |
| MCP servers | — | `~/.copilot/mcp-config.json` |
| Plugins (installed) | — | `~/.copilot/state/installed-plugins/` |

## Quick Reference: CLI Commands

### Skills
```
/skills list              # List available skills
/skills                   # Toggle skills on/off
/skills info              # Details about a skill
/skills add               # Add skills location
/skills reload            # Reload skills mid-session
/skills remove SKILL-DIR  # Remove a directly-added skill
```

### Custom Agents
```
/agent                    # List/create/select agents
copilot --agent NAME      # Use agent programmatically
```

### MCP Servers
```
/mcp show                 # List servers and status
/mcp show SERVER          # Server details
/mcp add                  # Add server interactively
/mcp edit SERVER          # Edit server config
/mcp delete SERVER        # Remove server
/mcp disable SERVER       # Disable temporarily
/mcp enable SERVER        # Re-enable
```

### Extensions
```
extensions_manage({ operation: "list" })                       # List loaded extensions
extensions_manage({ operation: "inspect", name: "NAME" })      # Extension details
extensions_manage({ operation: "scaffold", name: "NAME" })     # Generate skeleton (project)
extensions_manage({ operation: "scaffold", name: "NAME", location: "user" })  # User-scoped
extensions_reload({})                                          # Reload all extensions
```

### Plugins
```
copilot plugin install SPEC       # Install a plugin
copilot plugin list               # List installed
copilot plugin update NAME        # Update a plugin
copilot plugin update --all       # Update all
copilot plugin uninstall NAME     # Remove a plugin
copilot plugin disable NAME       # Disable
copilot plugin enable NAME        # Re-enable
```

### Marketplace
```
copilot plugin marketplace list            # List marketplaces
copilot plugin marketplace browse NAME     # Browse plugins
copilot plugin marketplace add OWNER/REPO  # Register
copilot plugin marketplace remove NAME     # Unregister
```
