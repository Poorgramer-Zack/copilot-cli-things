# Component Organization Patterns

Advanced patterns for organizing plugin components effectively.

## Component Lifecycle

### Discovery Phase

When Copilot CLI starts:

1. **Scan enabled plugins**: Scan plugin directory for each
2. **Discover components**: Look in default and custom paths
3. **Parse definitions**: Read YAML frontmatter and configurations
4. **Register components**: Make available to Copilot CLI
5. **Initialize**: Start MCP servers, register hooks

**Timing**: Component registration happens during Copilot CLI initialization, not continuously.

### Activation Phase

When components are used:

**Skills**: User invokes skill → Copilot CLI looks up → Executes
**Agents**: Task arrives → Copilot CLI evaluates capabilities → Selects agent
**Skills**: Task context matches description → Copilot CLI loads skill
**Hooks**: Event occurs → Copilot CLI calls matching hooks
**MCP Servers**: Tool call matches server capability → Forwards to server

## Skill File Organization Patterns

### Flat Structure

Single directory with all skill files:

```
skills/
├── build.md
├── test.md
├── deploy.md
├── review.md
└── docs.md
```

**When to use**:
- 5-15 skills total
- All skills at same abstraction level
- No clear categorization

**Advantages**:
- Simple, easy to navigate
- No configuration needed
- Fast discovery

### Categorized Structure

Multiple skill directories by function:

```
skills/
├── ci/
│   ├── build.md
│   └── test.md
├── admin/
│   ├── configure.md
│   └── manage.md
└── workflow/
    ├── review.md
    └── deploy.md
```

**When to use**:
- 15+ skills
- Clear functional categories
- Different permission levels

**Advantages**:
- Organized by purpose
- Easier to maintain
- Can restrict access by directory

### Rich Skill Structure

Skills with supporting resources:

```
skills/
├── ci/
│   ├── SKILL.md
│   ├── references/
│   │   └── pipeline-guide.md
│   └── examples/
│       └── workflow.yaml
├── deployment/
│   ├── SKILL.md
│   └── scripts/
│       └── deploy.sh
└── management/
    └── SKILL.md
```

**When to use**:
- Complex skill topics
- Need reference material and examples
- Multi-step processes

**Advantages**:
- Maximum organization
- Clear boundaries
- Scalable structure

## Agent Organization Patterns

### Role-Based Organization

Organize agents by their primary role:

```
agents/
├── code-reviewer.agent.md        # Reviews code
├── test-generator.agent.md       # Generates tests
├── documentation-writer.agent.md # Writes docs
└── refactorer.agent.md           # Refactors code
```

**When to use**:
- Agents have distinct, non-overlapping roles
- Users invoke agents manually
- Clear agent responsibilities

### Capability-Based Organization

Organize by specific capabilities:

```
agents/
├── python-expert.agent.md        # Python-specific
├── typescript-expert.agent.md    # TypeScript-specific
├── api-specialist.agent.md       # API design
└── database-specialist.agent.md  # Database work
```

**When to use**:
- Technology-specific agents
- Domain expertise focus
- Automatic agent selection

### Workflow-Based Organization

Organize by workflow stage:

```
agents/
├── planning-agent.agent.md      # Planning phase
├── implementation-agent.agent.md # Coding phase
├── testing-agent.agent.md       # Testing phase
└── deployment-agent.agent.md    # Deployment phase
```

**When to use**:
- Sequential workflows
- Stage-specific expertise
- Pipeline automation

## Skill Organization Patterns

### Topic-Based Organization

Each skill covers a specific topic:

```
skills/
├── api-design/
│   └── SKILL.md
├── error-handling/
│   └── SKILL.md
├── testing-strategies/
│   └── SKILL.md
└── performance-optimization/
    └── SKILL.md
```

**When to use**:
- Knowledge-based skills
- Educational or reference content
- Broad applicability

### Tool-Based Organization

Skills for specific tools or technologies:

```
skills/
├── docker/
│   ├── SKILL.md
│   └── references/
│       └── dockerfile-best-practices.md
├── kubernetes/
│   ├── SKILL.md
│   └── examples/
│       └── deployment.yaml
└── terraform/
    ├── SKILL.md
    └── scripts/
        └── validate-config.sh
```

**When to use**:
- Tool-specific expertise
- Complex tool configurations
- Tool best practices

### Workflow-Based Organization

Skills for complete workflows:

```
skills/
├── code-review-workflow/
│   ├── SKILL.md
│   └── references/
│       ├── checklist.md
│       └── standards.md
├── deployment-workflow/
│   ├── SKILL.md
│   └── scripts/
│       ├── pre-deploy.sh
│       └── post-deploy.sh
└── testing-workflow/
    ├── SKILL.md
    └── examples/
        └── test-structure.md
```

**When to use**:
- Multi-step processes
- Company-specific workflows
- Process automation

### Skill with Rich Resources

Comprehensive skill with all resource types:

```
skills/
└── api-testing/
    ├── SKILL.md              # Core skill (1500 words)
    ├── references/
    │   ├── rest-api-guide.md
    │   ├── graphql-guide.md
    │   └── authentication.md
    ├── examples/
    │   ├── basic-test.js
    │   ├── authenticated-test.js
    │   └── integration-test.js
    ├── scripts/
    │   ├── run-tests.sh
    │   └── generate-report.py
    └── assets/
        └── test-template.json
```

**Resource usage**:
- **SKILL.md**: Overview and when to use resources
- **references/**: Detailed guides (loaded as needed)
- **examples/**: Copy-paste code samples
- **scripts/**: Executable test runners
- **assets/**: Templates and configurations

## Hook Organization Patterns

### Monolithic Configuration

Single hooks.json with all hooks:

```
hooks/
├── hooks.json     # All hook definitions
└── scripts/
    ├── validate-write.sh
    ├── validate-bash.sh
    └── load-context.sh
```

**hooks.json**:
```json
{
  "preToolUse": [...],
  "postToolUse": [...],
  "agentStop": [...],
  "sessionStart": [...]
}
```

**When to use**:
- 5-10 hooks total
- Simple hook logic
- Centralized configuration

### Event-Based Organization

Separate files per event type:

```
hooks/
├── hooks.json              # Combines all
├── pre-tool-use.json      # preToolUse hooks
├── post-tool-use.json     # postToolUse hooks
├── agent-stop.json        # agentStop hooks
└── scripts/
    ├── validate/
    │   ├── write.sh
    │   └── bash.sh
    └── context/
        └── load.sh
```

**hooks.json** (combines):
```json
{
  "preToolUse": ${file:./pre-tool-use.json},
  "postToolUse": ${file:./post-tool-use.json},
  "agentStop": ${file:./agent-stop.json}
}
```

**Note**: Use build script to combine files, Copilot CLI doesn't support file references.

**When to use**:
- 10+ hooks
- Different teams managing different events
- Complex hook configurations

### Purpose-Based Organization

Group by functional purpose:

```
hooks/
├── hooks.json
└── scripts/
    ├── security/
    │   ├── validate-paths.sh
    │   ├── check-credentials.sh
    │   └── scan-malware.sh
    ├── quality/
    │   ├── lint-code.sh
    │   ├── check-tests.sh
    │   └── verify-docs.sh
    └── workflow/
        ├── notify-team.sh
        └── update-status.sh
```

**When to use**:
- Many hook scripts
- Clear functional boundaries
- Team specialization

## Script Organization Patterns

### Flat Scripts

All scripts in single directory:

```
scripts/
├── build.sh
├── test.py
├── deploy.sh
├── validate.js
└── report.py
```

**When to use**:
- 5-10 scripts
- All scripts related
- Simple plugin

### Categorized Scripts

Group by purpose:

```
scripts/
├── build/
│   ├── compile.sh
│   └── package.sh
├── test/
│   ├── run-unit.sh
│   └── run-integration.sh
├── deploy/
│   ├── staging.sh
│   └── production.sh
└── utils/
    ├── log.sh
    └── notify.sh
```

**When to use**:
- 10+ scripts
- Clear categories
- Reusable utilities

### Language-Based Organization

Group by programming language:

```
scripts/
├── bash/
│   ├── build.sh
│   └── deploy.sh
├── python/
│   ├── analyze.py
│   └── report.py
└── javascript/
    ├── bundle.js
    └── optimize.js
```

**When to use**:
- Multi-language scripts
- Different runtime requirements
- Language-specific dependencies

## Cross-Component Patterns

### Shared Resources

Components sharing common resources:

```
plugin/
├── skills/
│   ├── test.md        # Uses lib/test-utils.sh
│   └── deploy.md      # Uses lib/deploy-utils.sh
├── agents/
│   └── tester.agent.md # References lib/test-utils.sh
├── hooks/
│   └── scripts/
│       └── pre-test.sh # Sources lib/test-utils.sh
└── lib/
    ├── test-utils.sh
    └── deploy-utils.sh
```

**Usage in components**:
```bash
#!/bin/bash
source "./lib/test-utils.sh"
run_tests
```

**Benefits**:
- Code reuse
- Consistent behavior
- Easier maintenance

### Layered Architecture

Separate concerns into layers:

```
plugin/
├── skills/            # User interface layer
├── agents/            # Orchestration layer
├── skills/            # Knowledge layer
└── lib/
    ├── core/         # Core business logic
    ├── integrations/ # External services
    └── utils/        # Helper functions
```

**When to use**:
- Large plugins (100+ files)
- Multiple developers
- Clear separation of concerns

### Plugin Within Plugin

Nested plugin structure:

```
plugin/
├── core/              # Core functionality
│   ├── skills/
│   └── agents/
└── extensions/        # Optional extensions
    ├── extension-a/
    │   ├── skills/
    │   └── agents/
    └── extension-b/
        ├── skills/
        └── agents/
```

**When to use**:
- Modular functionality
- Optional features
- Plugin families

## Best Practices

### Naming

1. **Consistent naming**: Match file names to component purpose
2. **Descriptive names**: Indicate what component does
3. **Avoid abbreviations**: Use full words for clarity

### Organization

1. **Start simple**: Use flat structure, reorganize when needed
2. **Group related items**: Keep related components together
3. **Separate concerns**: Don't mix unrelated functionality

### Scalability

1. **Plan for growth**: Choose structure that scales
2. **Refactor early**: Reorganize before it becomes painful
3. **Document structure**: Explain organization in README

### Maintainability

1. **Consistent patterns**: Use same structure throughout
2. **Minimize nesting**: Keep directory depth manageable
3. **Use conventions**: Follow community standards

### Performance

1. **Avoid deep nesting**: Impacts discovery time
2. **Minimize custom paths**: Use defaults when possible
3. **Keep configurations small**: Large configs slow loading
