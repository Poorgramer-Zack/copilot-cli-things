# Skill Development Skill

Comprehensive guidance on creating Copilot CLI skills, including file format, frontmatter options, dynamic arguments, and best practices.

## Overview

This skill provides knowledge about:
- Skill file format and structure
- YAML frontmatter configuration fields
- Dynamic arguments ($ARGUMENTS, $1, $2, etc.)
- File references with @ syntax
- Bash execution with !` syntax
- Skill organization and namespacing
- Best practices for skill development
- Plugin-specific features (relative paths, plugin patterns)
- Integration with plugin components (agents, skills, hooks)
- Validation patterns and error handling

## Skill Structure

### SKILL.md (~2,470 words)

Core skill content covering:

**Fundamentals:**
- Skill basics and locations
- File format (Markdown with optional frontmatter)
- YAML frontmatter fields overview
- Dynamic arguments ($ARGUMENTS and positional)
- File references (@ syntax)
- Bash execution (!` syntax)
- Skill organization patterns
- Best practices and common patterns
- Troubleshooting

**Plugin-Specific:**
- Relative path resolution
- Plugin skill discovery and organization
- Plugin skill patterns (configuration, template, multi-script)
- Integration with plugin components (agents, skills, hooks)
- Validation patterns (argument, file, resource, error handling)

### References

Detailed documentation:

- **frontmatter-reference.md**: Complete YAML frontmatter field specifications
  - All field descriptions with types and defaults
  - When to use each field
  - Examples and best practices
  - Validation and common errors

- **plugin-features-reference.md**: Plugin-specific skill features
  - Plugin skill discovery and organization
  - Relative path resolution usage
  - Plugin skill patterns (configuration, template, multi-script)
  - Integration with plugin agents, skills, and hooks
  - Validation patterns and error handling

### Examples

Practical skill examples:

- **simple-commands.md**: 10 complete skill examples
  - Code review skills
  - Testing skills
  - Deployment skills
  - Documentation generators
  - Git integration skills
  - Analysis and research skills

- **plugin-commands.md**: 10 plugin-specific skill examples
  - Simple plugin skills with scripts
  - Multi-script workflows
  - Template-based generation
  - Configuration-driven deployment
  - Agent and skill integration
  - Multi-component workflows
  - Validated input skills
  - Environment-aware skills

## When This Skill Triggers

Copilot CLI activates this skill when users:
- Ask to "create a skill" or "add a skill"
- Need to "write a custom skill"
- Want to "define skill arguments"
- Ask about "skill frontmatter" or YAML configuration
- Need to "organize skills" or use namespacing
- Want to create skills with file references
- Ask about "bash execution in skills"
- Need skill development best practices

## Progressive Disclosure

The skill uses progressive disclosure:

1. **SKILL.md** (~2,470 words): Core concepts, common patterns, and plugin features overview
2. **References** (~13,500 words total): Detailed specifications
   - frontmatter-reference.md (~1,200 words)
   - plugin-features-reference.md (~1,800 words)
   - interactive-commands.md (~2,500 words)
   - advanced-workflows.md (~1,700 words)
   - testing-strategies.md (~2,200 words)
   - documentation-patterns.md (~2,000 words)
   - marketplace-considerations.md (~2,200 words)
3. **Examples** (~6,000 words total): Complete working skill examples
   - simple-commands.md
   - plugin-commands.md

Copilot CLI loads references and examples as needed based on task.

## Skill Basics Quick Reference

### File Format

```markdown
---
description: Brief description
argument-hint: [arg1] [arg2]
allowed-tools: read, powershell(git:*)
---

Skill prompt content with:
- Arguments: $1, $2, or $ARGUMENTS
- Files: @path/to/file
- Bash: !`command here`
```

### Locations

- **Project**: `.github/skills/` (shared with team)
- **Personal**: `~/.github/skills/` (your skills)
- **Plugin**: `plugin-name/skills/` (plugin-specific)

### Key Features

**Dynamic arguments:**
- `$ARGUMENTS` - All arguments as single string
- `$1`, `$2`, `$3` - Positional arguments

**File references:**
- `@path/to/file` - Include file contents

**Bash execution:**
- `!`command`` - Execute and include output

## Frontmatter Fields Quick Reference

| Field | Purpose | Example |
|-------|---------|---------|
| `description` | Brief description for /help | `"Review code for issues"` |
| `allowed-tools` | Restrict tool access | `read, powershell(git:*)` |
| `model` | Specify model | `sonnet`, `opus`, `haiku` |
| `argument-hint` | Document arguments | `[pr-number] [priority]` |
| `disable-model-invocation` | Manual-only skill | `true` |

## Common Patterns

### Simple Review Skill

```markdown
---
description: Review code for issues
---

Review this code for quality and potential bugs.
```

### Skill with Arguments

```markdown
---
description: Deploy to environment
argument-hint: [environment] [version]
---

Deploy to $1 environment using version $2
```

### Skill with File Reference

```markdown
---
description: Document file
argument-hint: [file-path]
---

Generate documentation for @$1
```

### Skill with Bash Execution

```markdown
---
description: Show Git status
allowed-tools: powershell(git:*)
---

Current status: !`git status`
Recent commits: !`git log --oneline -5`
```

## Development Workflow

1. **Design skill:**
   - Define purpose and scope
   - Determine required arguments
   - Identify needed tools

2. **Create file:**
   - Choose appropriate location
   - Create `.md` file with skill name
   - Write basic prompt

3. **Add frontmatter:**
   - Start minimal (just description)
   - Add fields as needed (allowed-tools, etc.)
   - Document arguments with argument-hint

4. **Test skill:**
   - Invoke with `/skill-name`
   - Verify arguments work
   - Check bash execution
   - Test file references

5. **Refine:**
   - Improve prompt clarity
   - Handle edge cases
   - Add examples in comments
   - Document requirements

## Best Practices Summary

1. **Single responsibility**: One skill, one clear purpose
2. **Clear descriptions**: Make discoverable in `/help`
3. **Document arguments**: Always use argument-hint
4. **Minimal tools**: Use most restrictive allowed-tools
5. **Test thoroughly**: Verify all features work
6. **Add comments**: Explain complex logic
7. **Handle errors**: Consider missing arguments/files

## Status

**Completed enhancements:**
- ✓ Plugin skill patterns (relative paths, discovery, organization)
- ✓ Integration patterns (agents, skills, hooks coordination)
- ✓ Validation patterns (input, file, resource validation, error handling)

**Remaining enhancements (in progress):**
- Advanced workflows (multi-step skill sequences)
- Testing strategies (how to test skills effectively)
- Documentation patterns (skill documentation best practices)
- Marketplace considerations (publishing and distribution)

## Maintenance

To update this skill:
1. Keep SKILL.md focused on core fundamentals
2. Move detailed specifications to references/
3. Add new examples/ for different use cases
4. Update frontmatter when new fields added
5. Ensure imperative/infinitive form throughout
6. Test examples work with current Copilot CLI

## Version History

**v0.1.0** (2025-01-15):
- Initial release with basic skill fundamentals
- Frontmatter field reference
- 10 simple skill examples
- Ready for plugin-specific pattern additions
