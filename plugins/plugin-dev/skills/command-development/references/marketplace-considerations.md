# Marketplace Considerations for Skills

Guidelines for creating skills designed for distribution and marketplace success.

## Overview

Skills distributed through marketplaces need additional consideration beyond personal use skills. They must work across environments, handle diverse use cases, and provide excellent user experience for unknown users.

## Design for Distribution

### Universal Compatibility

**Cross-platform considerations:**

```markdown
---
description: Cross-platform skill
allowed-tools: execute(*)
---

# Platform-Aware Skill

Detecting platform...

case "$(uname)" in
  Darwin*)  PLATFORM="macOS" ;;
  Linux*)   PLATFORM="Linux" ;;
  MINGW*|MSYS*|CYGWIN*) PLATFORM="Windows" ;;
  *)        PLATFORM="Unknown" ;;
esac

Platform: $PLATFORM

<!-- Adjust behavior based on platform -->
if [ "$PLATFORM" = "Windows" ]; then
  # Windows-specific handling
  PATH_SEP="\\"
  NULL_DEVICE="NUL"
else
  # Unix-like handling
  PATH_SEP="/"
  NULL_DEVICE="/dev/null"
fi

[Platform-appropriate implementation...]
```

**Avoid platform-specific commands:**

```markdown
<!-- BAD: macOS-specific -->
!`pbcopy < file.txt`

<!-- GOOD: Platform detection -->
if command -v pbcopy > /dev/null; then
  pbcopy < file.txt
elif command -v xclip > /dev/null; then
  xclip -selection clipboard < file.txt
elif command -v clip.exe > /dev/null; then
  cat file.txt | clip.exe
else
  echo "Clipboard not available on this platform"
fi
```

### Minimal Dependencies

**Check for required tools:**

```markdown
---
description: Dependency-aware skill
allowed-tools: execute(*)
---

# Check Dependencies

Required tools:
- git
- jq
- node

Checking availability...

MISSING_DEPS=""

for tool in git jq node; do
  if ! command -v $tool > /dev/null; then
    MISSING_DEPS="$MISSING_DEPS $tool"
  fi
done

if [ -n "$MISSING_DEPS" ]; then
  ❌ ERROR: Missing required dependencies:$MISSING_DEPS

  INSTALLATION:
  - git: https://git-scm.com/downloads
  - jq: https://stedolan.github.io/jq/download/
  - node: https://nodejs.org/

  Install missing tools and try again.

  Exit.
fi

✓ All dependencies available

[Continue with skill...]
```

**Document optional dependencies:**

```markdown
<!--
DEPENDENCIES:
  Required:
  - git 2.0+: Version control
  - jq 1.6+: JSON processing

  Optional:
  - gh: GitHub CLI (for PR operations)
  - docker: Container operations (for containerized tests)

  Feature availability depends on installed tools.
-->
```

### Graceful Degradation

**Handle missing features:**

```markdown
---
description: Feature-aware skill
---

# Feature Detection

Detecting available features...

FEATURES=""

if command -v gh > /dev/null; then
  FEATURES="$FEATURES github"
fi

if command -v docker > /dev/null; then
  FEATURES="$FEATURES docker"
fi

Available features: $FEATURES

if echo "$FEATURES" | grep -q "github"; then
  # Full functionality with GitHub integration
  echo "✓ GitHub integration available"
else
  # Reduced functionality without GitHub
  echo "⚠ Limited functionality: GitHub CLI not installed"
  echo "  Install 'gh' for full features"
fi

[Adapt behavior based on available features...]
```

## User Experience for Unknown Users

### Clear Onboarding

**First-run experience:**

```markdown
---
description: Skill with onboarding
allowed-tools: read, edit
---

# First Run Check

if [ ! -f ".github/skill-initialized" ]; then
  **Welcome to Skill Name!**

  This appears to be your first time using this skill.

  WHAT THIS SKILL DOES:
  [Brief explanation of purpose and benefits]

  QUICK START:
  1. Basic usage: /command [arg]
  2. For help: /command help
  3. Examples: /command examples

  SETUP:
  No additional setup required. You're ready to go!

  ✓ Initialization complete

  [Create initialization marker]

  Ready to proceed with your request...
fi

[Normal skill execution...]
```

**Progressive feature discovery:**

```markdown
---
description: Skill with tips
---

# Skill Execution

[Main functionality...]

---

💡 TIP: Did you know?

You can speed up this skill with the --fast flag:
  /command --fast [args]

For more tips: /command tips
```

### Comprehensive Error Handling

**Anticipate user mistakes:**

```markdown
---
description: Forgiving skill
---

# User Input Handling

Argument: "$1"

<!-- Check for common typos -->
if [ "$1" = "hlep" ] || [ "$1" = "hepl" ]; then
  Did you mean: help?

  Showing help instead...
  [Display help]

  Exit.
fi

<!-- Suggest similar commands if not found -->
if [ "$1" != "valid-option1" ] && [ "$1" != "valid-option2" ]; then
  ❌ Unknown option: $1

  Did you mean:
  - valid-option1 (most similar)
  - valid-option2

  For all options: /command help

  Exit.
fi

[Skill continues...]
```

**Helpful diagnostics:**

```markdown
---
description: Diagnostic skill
---

# Operation Failed

The operation could not complete.

**Diagnostic Information:**

Environment:
- Platform: $(uname)
- Shell: $SHELL
- Working directory: $(pwd)
- Skill: /command $@

Checking common issues:
- Git repository: $(git rev-parse --git-dir 2>&1)
- Write permissions: $(test -w . && echo "OK" || echo "DENIED")
- Required files: $(test -f config.yml && echo "Found" || echo "Missing")

This information helps debug the issue.

For support, include the above diagnostics.
```

## Distribution Best Practices

### Namespace Awareness

**Avoid name collisions:**

```markdown
---
description: Namespaced skill
---

<!--
SKILL NAME: plugin-name-command

This skill is namespaced with the plugin name to avoid
conflicts with skills from other plugins.

Alternative naming approaches:
- Use plugin prefix: /plugin-command
- Use category: /category-command
- Use verb-noun: /verb-noun

Chosen approach: plugin-name prefix
Reasoning: Clearest ownership, least likely to conflict
-->

# Plugin Name Skill

[Implementation...]
```

**Document naming rationale:**

```markdown
<!--
NAMING DECISION:

Skill name: /deploy-app

Alternatives considered:
- /deploy: Too generic, likely conflicts
- /app-deploy: Less intuitive ordering
- /my-plugin-deploy: Too verbose

Final choice balances:
- Discoverability (clear purpose)
- Brevity (easy to type)
- Uniqueness (unlikely conflicts)
-->
```

### Configurability

**User preferences:**

```markdown
---
description: Configurable skill
allowed-tools: read
---

# Load User Configuration

Default configuration:
- verbose: false
- color: true
- max_results: 10

Checking for user config: .github/plugin-name.local.md

if [ -f ".github/plugin-name.local.md" ]; then
  # Parse YAML frontmatter for settings
  VERBOSE=$(grep "^verbose:" .github/plugin-name.local.md | cut -d: -f2 | tr -d ' ')
  COLOR=$(grep "^color:" .github/plugin-name.local.md | cut -d: -f2 | tr -d ' ')
  MAX_RESULTS=$(grep "^max_results:" .github/plugin-name.local.md | cut -d: -f2 | tr -d ' ')

  echo "✓ Using user configuration"
else
  echo "Using default configuration"
  echo "Create .github/plugin-name.local.md to customize"
fi

[Use configuration in skill...]
```

**Sensible defaults:**

```markdown
---
description: Skill with smart defaults
---

# Smart Defaults

Configuration:
- Format: ${FORMAT:-json}  # Defaults to json
- Output: ${OUTPUT:-stdout}  # Defaults to stdout
- Verbose: ${VERBOSE:-false}  # Defaults to false

These defaults work for 80% of use cases.

Override with arguments:
  /command --format yaml --output file.txt --verbose

Or set in .github/plugin-name.local.md:
\`\`\`yaml
---
format: yaml
output: custom.txt
verbose: true
---
\`\`\`
```

### Version Compatibility

**Version checking:**

```markdown
---
description: Version-aware skill
---

<!--
SKILL VERSION: 2.1.0

COMPATIBILITY:
- Requires plugin version: >= 2.0.0
- Breaking changes from v1.x documented in MIGRATION.md

VERSION HISTORY:
- v2.1.0: Added --new-feature flag
- v2.0.0: BREAKING: Changed argument order
- v1.0.0: Initial release
-->

# Version Check

Skill version: 2.1.0
Plugin version: [detect from plugin structure]

if [  "$PLUGIN_VERSION" < "2.0.0" ]; then
  ❌ ERROR: Incompatible plugin version

  This skill requires plugin version >= 2.0.0
  Current version: $PLUGIN_VERSION

  Update plugin:
    /plugin update plugin-name

  Exit.
fi

✓ Version compatible

[Skill continues...]
```

**Deprecation warnings:**

```markdown
---
description: Skill with deprecation warnings
---

# Deprecation Check

if [ "$1" = "--old-flag" ]; then
  ⚠️  DEPRECATION WARNING

  The --old-flag option is deprecated as of v2.0.0
  It will be removed in v3.0.0 (est. June 2025)

  Use instead: --new-flag

  Example:
    Old: /command --old-flag value
    New: /command --new-flag value

  See migration guide: /command migrate

  Continuing with deprecated behavior for now...
fi

[Handle both old and new flags during deprecation period...]
```

## Marketplace Presentation

### Skill Discovery

**Descriptive naming:**

```markdown
---
description: Review pull request with security and quality checks
---

<!-- GOOD: Descriptive name and description -->
```

```markdown
---
description: Do the thing
---

<!-- BAD: Vague description -->
```

**Searchable keywords:**

```markdown
<!--
KEYWORDS: security, code-review, quality, validation, audit

These keywords help users discover this skill when searching
for related functionality in the marketplace.
-->
```

### Showcase Examples

**Compelling demonstrations:**

```markdown
---
description: Advanced code analysis skill
---

# Code Analysis Skill

This skill performs deep code analysis with actionable insights.

## Demo: Quick Security Audit

Try it now:
\`\`\`
/analyze-code src/ --security
\`\`\`

**What you'll get:**
- Security vulnerability detection
- Code quality metrics
- Performance bottleneck identification
- Actionable recommendations

**Sample output:**
\`\`\`
Security Analysis Results
=========================

🔴 Critical (2):
  - SQL injection risk in users.js:45
  - XSS vulnerability in display.js:23

🟡 Warnings (5):
  - Unvalidated input in api.js:67
  ...

Recommendations:
1. Fix critical issues immediately
2. Review warnings before next release
3. Run /analyze-code --fix for auto-fixes
\`\`\`

---

Ready to analyze your code...

[Skill implementation...]
```

### User Reviews and Feedback

**Feedback mechanism:**

```markdown
---
description: Skill with feedback
---

# Skill Complete

[Skill results...]

---

**How was your experience?**

This helps improve the skill for everyone.

Rate this skill:
- 👍 Helpful
- 👎 Not helpful
- 🐛 Found a bug
- 💡 Have a suggestion

Reply with an emoji or:
- /command feedback

Your feedback matters!
```

**Usage analytics preparation:**

```markdown
<!--
ANALYTICS NOTES:

Track for improvement:
- Most common arguments
- Failure rates
- Average execution time
- User satisfaction scores

Privacy-preserving:
- No personally identifiable information
- Aggregate statistics only
- User opt-out respected
-->
```

## Quality Standards

### Professional Polish

**Consistent branding:**

```markdown
---
description: Branded skill
---

# ✨ Skill Name

Part of the [Plugin Name] suite

[Skill functionality...]

---

**Need Help?**
- Documentation: https://docs.example.com
- Support: support@example.com
- Community: https://community.example.com

Powered by Plugin Name v2.1.0
```

**Attention to detail:**

```markdown
<!-- Details that matter -->

✓ Use proper emoji/symbols consistently
✓ Align output columns neatly
✓ Format numbers with thousands separators
✓ Use color/formatting appropriately
✓ Provide progress indicators
✓ Show estimated time remaining
✓ Confirm successful operations
```

### Reliability

**Idempotency:**

```markdown
---
description: Idempotent skill
---

# Safe Repeated Execution

Checking if operation already completed...

if [ -f ".github/operation-completed.flag" ]; then
  ℹ️  Operation already completed

  Completed at: $(cat .github/operation-completed.flag)

  To re-run:
  1. Remove flag: rm .github/operation-completed.flag
  2. Run skill again

  Otherwise, no action needed.

  Exit.
fi

Performing operation...

[Safe, repeatable operation...]

Marking complete...
echo "$(date)" > .github/operation-completed.flag
```

**Atomic operations:**

```markdown
---
description: Atomic skill
---

# Atomic Operation

This operation is atomic - either fully succeeds or fully fails.

Creating temporary workspace...
TEMP_DIR=$(mktemp -d)

Performing changes in isolated environment...
[Make changes in $TEMP_DIR]

if [ $? -eq 0 ]; then
  ✓ Changes validated

  Applying changes atomically...
  mv $TEMP_DIR/* ./target/

  ✓ Operation complete
else
  ❌ Changes failed validation

  Rolling back...
  rm -rf $TEMP_DIR

  No changes applied. Safe to retry.
fi
```

## Testing for Distribution

### Pre-Release Checklist

```markdown
<!--
PRE-RELEASE CHECKLIST:

Functionality:
- [ ] Works on macOS
- [ ] Works on Linux
- [ ] Works on Windows (WSL)
- [ ] All arguments tested
- [ ] Error cases handled
- [ ] Edge cases covered

User Experience:
- [ ] Clear description
- [ ] Helpful error messages
- [ ] Examples provided
- [ ] First-run experience good
- [ ] Documentation complete

Distribution:
- [ ] No hardcoded paths
- [ ] Dependencies documented
- [ ] Configuration options clear
- [ ] Version number set
- [ ] Changelog updated

Quality:
- [ ] No TODO comments
- [ ] No debug code
- [ ] Performance acceptable
- [ ] Security reviewed
- [ ] Privacy considered

Support:
- [ ] README complete
- [ ] Troubleshooting guide
- [ ] Support contact provided
- [ ] Feedback mechanism
- [ ] License specified
-->
```

### Beta Testing

**Beta release approach:**

```markdown
---
description: Beta skill (v0.9.0)
---

# 🧪 Beta Skill

**This is a beta release**

Features may change based on feedback.

BETA STATUS:
- Version: 0.9.0
- Stability: Experimental
- Support: Limited
- Feedback: Encouraged

Known limitations:
- Performance not optimized
- Some edge cases not handled
- Documentation incomplete

Help improve this skill:
- Report issues: /command report-issue
- Suggest features: /command suggest
- Join beta testers: /command join-beta

---

[Skill implementation...]

---

**Thank you for beta testing!**

Your feedback helps make this skill better.
```

## Maintenance and Updates

### Update Strategy

**Versioned skills:**

```markdown
<!--
VERSION STRATEGY:

Major (X.0.0): Breaking changes
- Document all breaking changes
- Provide migration guide
- Support old version briefly

Minor (x.Y.0): New features
- Backward compatible
- Announce new features
- Update examples

Patch (x.y.Z): Bug fixes
- No user-facing changes
- Update changelog
- Security fixes prioritized

Release schedule:
- Patches: As needed
- Minors: Monthly
- Majors: Annually or as needed
-->
```

**Update notifications:**

```markdown
---
description: Update-aware skill
---

# Check for Updates

Current version: 2.1.0
Latest version: [check if available]

if [ "$CURRENT_VERSION" != "$LATEST_VERSION" ]; then
  📢 UPDATE AVAILABLE

  New version: $LATEST_VERSION
  Current: $CURRENT_VERSION

  What's new:
  - Feature improvements
  - Bug fixes
  - Performance enhancements

  Update with:
    /plugin update plugin-name

  Release notes: https://releases.example.com/v$LATEST_VERSION
fi

[Skill continues...]
```

## Best Practices Summary

### Distribution Design

1. **Universal**: Works across platforms and environments
2. **Self-contained**: Minimal dependencies, clear requirements
3. **Graceful**: Degrades gracefully when features unavailable
4. **Forgiving**: Anticipates and handles user mistakes
5. **Helpful**: Clear errors, good defaults, excellent docs

### Marketplace Success

1. **Discoverable**: Clear name, good description, searchable keywords
2. **Professional**: Polished presentation, consistent branding
3. **Reliable**: Tested thoroughly, handles edge cases
4. **Maintainable**: Versioned, updated regularly, supported
5. **User-focused**: Great UX, responsive to feedback

### Quality Standards

1. **Complete**: Fully documented, all features working
2. **Tested**: Works in real environments, edge cases handled
3. **Secure**: No vulnerabilities, safe operations
4. **Performant**: Reasonable speed, resource-efficient
5. **Ethical**: Privacy-respecting, user consent

With these considerations, skills become marketplace-ready and delight users across diverse environments and use cases.
