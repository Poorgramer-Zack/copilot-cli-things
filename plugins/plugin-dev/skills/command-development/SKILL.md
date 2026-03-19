---
name: Skill & Agent Development
description: This skill should be used when the user asks to "create a skill", "add a skill", "write a SKILL.md", "create an agent", "add an agent", or needs guidance on creating skills and agents for Copilot CLI plugins.
version: 0.2.0
---

# Skill & Agent Development for Copilot CLI

## Overview

Skills and agents are the primary extension mechanisms in Copilot CLI plugins. Skills provide specialized knowledge and workflows via SKILL.md files, while agents are autonomous subprocesses defined as `.agent.md` files. Together they enable powerful, reusable capabilities.

**Key concepts:**
- Skills use SKILL.md with YAML frontmatter for structured knowledge
- Agents use `.agent.md` files with YAML frontmatter for autonomous tasks
- Both are auto-discovered from their respective directories
- Progressive disclosure manages context efficiently

## Skills

### What is a Skill?

A skill is a SKILL.md file providing specialized knowledge that Copilot activates based on task context. Skills provide:
- **Reusability**: Define once, use repeatedly
- **Consistency**: Standardize common workflows
- **Sharing**: Distribute across team or projects
- **Efficiency**: Context-aware knowledge loading

### Critical: Skills are Instructions FOR Copilot

**Skills are written for agent consumption, not human consumption.**

When Copilot activates a skill, the SKILL.md content becomes Copilot's instructions. Write skills as directives about what to do, not as messages to the user.

**Correct approach (instructions for Copilot):**
```markdown
Review this code for security vulnerabilities including:
- SQL injection
- XSS attacks
- Authentication issues

Provide specific line numbers and severity ratings.
```

**Incorrect approach (messages to user):**
```markdown
This skill will review your code for security issues.
You'll receive a report with vulnerability details.
```

### Skill Locations

**Plugin skills** (bundled with plugins):
- Location: `plugin-name/skills/skill-name/SKILL.md`
- Scope: Available when plugin installed
- Use for: Plugin-specific functionality

### File Format

Skills are SKILL.md files in named subdirectories:

```
skills/
├── code-review/
│   └── SKILL.md         # code-review skill
├── testing/
│   └── SKILL.md         # testing skill
└── deployment/
    └── SKILL.md         # deployment skill
```

### YAML Frontmatter

```markdown
---
name: Skill Name
description: This skill should be used when the user asks to "specific phrase 1", "specific phrase 2", or needs guidance on [topic].
version: 1.0.0
---

Skill instructions and guidance...
```

**Frontmatter fields:**
- `name` (required): Human-readable skill name
- `description` (required): Triggering conditions with specific phrases
- `version` (optional): Semantic version

## Agents

### What is an Agent?

An agent is an `.agent.md` file that defines an autonomous subprocess. Agents handle complex, multi-step tasks independently.

### Agent File Format

```markdown
---
description: Use this agent when [triggering conditions].
model: claude-sonnet-4.5
tools: [read, edit, grep]
---

You are [agent role description]...

**Your Core Responsibilities:**
1. [Responsibility 1]
2. [Responsibility 2]
```

### Agent Frontmatter Fields

| Field | Required | Format | Example |
|-------|----------|--------|---------|
| description | Yes | Text | Use when reviewing code... |
| model | No | model name | claude-sonnet-4.5 |
| tools | No | Array (lowercase) | [read, edit, grep] |

**Model options:** `claude-sonnet-4.5`, `claude-opus-4.5`, `claude-haiku-4.5` (omit to use session default)

### Agent Organization

```
plugin-name/
└── agents/
    ├── code-reviewer.agent.md
    ├── test-generator.agent.md
    └── refactorer.agent.md
```

All `.agent.md` files in `agents/` are auto-discovered.

## Integration Between Skills and Agents

Skills and agents can work together for powerful workflows:

### Agent Using Skills

Agents can leverage plugin skills for specialized knowledge:

```markdown
---
description: Use this agent for comprehensive code review.
tools: [read, grep, glob]
---

You are a code review agent.

Use the coding-standards skill to ensure:
- Complete endpoint documentation
- Consistent formatting
- Example quality

Generate production-ready review reports.
```

### Multi-Component Workflows

Combine agents, skills, and scripts:

```markdown
---
description: Use this agent for comprehensive review workflows.
tools: [read, edit, powershell, grep]
---

You are a review workflow agent.

Phase 1 - Static Analysis:
Run linting scripts from the plugin.

Phase 2 - Deep Review:
Apply coding-standards skill for validation.

Phase 3 - Report:
Compile findings into structured report.
```

## Best Practices

### Skill Design

1. **Specific trigger phrases:** Include exact phrases users would say
2. **Third-person descriptions:** "This skill should be used when..."
3. **Lean SKILL.md:** Target 1,500-2,000 words, move details to references/
4. **Progressive disclosure:** Core in SKILL.md, details in references/
5. **Imperative form:** Use verb-first instructions

### Agent Design

1. **Clear triggering conditions:** Be specific about when to use
2. **Minimal tools:** Only grant tools the agent needs
3. **Structured system prompt:** Responsibilities, process, output format
4. **Appropriate model:** Omit for default, specify only when needed

### Organization

1. **Consistent naming:** Use kebab-case for directories and files
2. **Related grouping:** Keep related skills and agents together
3. **Documentation:** Include README files for guidance

## Troubleshooting

**Skill not activating:**
- Check SKILL.md exists in skill subdirectory
- Verify frontmatter has name and description
- Ensure description includes specific trigger phrases
- Restart Copilot CLI

**Agent not loading:**
- Check file uses `.agent.md` extension
- Verify frontmatter has description field
- Ensure file is in `agents/` directory
- Restart Copilot CLI

**Tools not working in agent:**
- Verify tool names are lowercase: `[read, edit, grep]`
- Check tool names match Copilot CLI tool names
- Ensure tools array syntax is correct

---

For detailed skill development guidance, see the `skill-development` skill.
For detailed agent development guidance, see the `agent-development` skill.
For plugin structure guidance, see the `plugin-structure` skill.
