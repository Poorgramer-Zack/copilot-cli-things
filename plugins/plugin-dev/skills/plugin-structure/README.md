# Plugin Structure Skill

Comprehensive guidance on Copilot CLI plugin architecture, directory layout, and best practices.

## Overview

This skill provides detailed knowledge about:
- Plugin directory structure and organization
- Directory-based plugin conventions (no manifest file)
- Component organization (skills, agents, hooks, extensions)
- Auto-discovery mechanisms
- Relative path references
- File naming conventions

## Skill Structure

### SKILL.md (1,619 words)

Core skill content covering:
- Directory structure overview
- Component organization patterns
- Relative path usage
- File naming conventions
- Auto-discovery mechanism
- Best practices
- Common patterns
- Troubleshooting

### References

Detailed documentation for deep dives:

- **manifest-reference.md**: Complete plugin structure reference
  - Directory conventions
  - Component directories (skills/, agents/, hooks/, extensions/)
  - Environment variables
  - Validation rules

- **component-patterns.md**: Advanced organization patterns
  - Component lifecycle (discovery, activation)
  - Skill organization patterns
  - Agent organization patterns
  - Hook organization patterns
  - Script organization patterns
  - Cross-component patterns
  - Best practices for scalability

### Examples

Three complete plugin examples:

- **minimal-plugin.md**: Simplest possible plugin
  - Single skill
  - No manifest needed
  - When to use this pattern

- **standard-plugin.md**: Well-structured production plugin
  - Multiple components (skills, agents, hooks)
  - Rich skill structure
  - Integration between components

- **advanced-plugin.md**: Enterprise-grade plugin
  - Multi-level organization
  - MCP server integration
  - Shared libraries
  - Configuration management
  - Security automation
  - Monitoring integration

## When This Skill Triggers

Copilot CLI activates this skill when users:
- Ask to "create a plugin" or "scaffold a plugin"
- Need to "understand plugin structure"
- Want to "organize plugin components"
- Ask about plugin directory conventions
- Want to "add skills/agents/hooks"
- Need "configure auto-discovery" help
- Ask about plugin architecture or best practices

## Progressive Disclosure

The skill uses progressive disclosure to manage context:

1. **SKILL.md** (~1600 words): Core concepts and workflows
2. **References** (~6000 words): Detailed structure references and patterns
3. **Examples** (~8000 words): Complete working examples

Copilot loads references and examples only as needed based on the task.

## Related Skills

This skill works well with:
- **hook-development**: For creating plugin hooks
- **mcp-integration**: For integrating MCP servers (when available)
- **marketplace-publishing**: For publishing plugins (when available)

## Maintenance

To update this skill:
1. Keep SKILL.md lean and focused on core concepts
2. Move detailed information to references/
3. Add new examples/ for common patterns
4. Update version in SKILL.md frontmatter
5. Ensure all documentation uses imperative/infinitive form
