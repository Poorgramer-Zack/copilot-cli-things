# Minimal Plugin Example

A bare-bones plugin with a single skill.

## Directory Structure

```
hello-world/
└── skills/
    └── hello.md
```

## File Contents

### skills/hello.md

```markdown
---
description: Prints a friendly greeting message
---

# Hello Skill

Print a friendly greeting to the user.

## Implementation

Output the following message to the user:

> Hello! This is a simple skill from the hello-world plugin.
>
> Use this as a starting point for building more complex plugins.

Include the current timestamp in the greeting to show the skill executed successfully.
```

## Usage

After installing the plugin:

```
$ copilot
> @hello
Hello! This is a simple skill from the hello-world plugin.

Use this as a starting point for building more complex plugins.

Executed at: 2025-01-15 14:30:22 UTC
```

## Key Points

1. **No manifest needed**: Directory-based plugin structure
2. **Single skill**: One markdown file in `skills/` directory
3. **Auto-discovery**: Copilot CLI finds the skill automatically
4. **No dependencies**: No scripts, hooks, or external resources

## When to Use This Pattern

- Quick prototypes
- Single-purpose utilities
- Learning plugin development
- Internal team tools with one specific function

## Extending This Plugin

To add more functionality:

1. **Add skills**: Create more `.md` files in `skills/`
2. **Add agents**: Create `agents/` directory with `.agent.md` definitions
3. **Add hooks**: Create `hooks/hooks.json` for event handling
