# Skill Testing Strategies

Comprehensive strategies for testing skills before deployment and distribution.

## Overview

Testing skills ensures they work correctly, handle edge cases, and provide good user experience. A systematic testing approach catches issues early and builds confidence in skill reliability.

## Testing Levels

### Level 1: Syntax and Structure Validation

**What to test:**
- YAML frontmatter syntax
- Markdown format
- File location and naming

**How to test:**

```bash
# Validate YAML frontmatter
head -n 20 .github/skills/my-command.md | grep -A 10 "^---"

# Check for closing frontmatter marker
head -n 20 .github/skills/my-command.md | grep -c "^---" # Should be 2

# Verify file has .md extension
ls .github/skills/*.md

# Check file is in correct location
test -f .github/skills/my-command.md && echo "Found" || echo "Missing"
```

**Automated validation script:**

```bash
#!/bin/bash
# validate-command.sh

COMMAND_FILE="$1"

if [ ! -f "$COMMAND_FILE" ]; then
  echo "ERROR: File not found: $COMMAND_FILE"
  exit 1
fi

# Check .md extension
if [[ ! "$COMMAND_FILE" =~ \.md$ ]]; then
  echo "ERROR: File must have .md extension"
  exit 1
fi

# Validate YAML frontmatter if present
if head -n 1 "$COMMAND_FILE" | grep -q "^---"; then
  # Count frontmatter markers
  MARKERS=$(head -n 50 "$COMMAND_FILE" | grep -c "^---")
  if [ "$MARKERS" -ne 2 ]; then
    echo "ERROR: Invalid YAML frontmatter (need exactly 2 '---' markers)"
    exit 1
  fi
  echo "✓ YAML frontmatter syntax valid"
fi

# Check for empty file
if [ ! -s "$COMMAND_FILE" ]; then
  echo "ERROR: File is empty"
  exit 1
fi

echo "✓ Skill file structure valid"
```

### Level 2: Frontmatter Field Validation

**What to test:**
- Field types correct
- Values in valid ranges
- Required fields present (if any)

**Validation script:**

```bash
#!/bin/bash
# validate-frontmatter.sh

COMMAND_FILE="$1"

# Extract YAML frontmatter
FRONTMATTER=$(sed -n '/^---$/,/^---$/p' "$COMMAND_FILE" | sed '1d;$d')

if [ -z "$FRONTMATTER" ]; then
  echo "No frontmatter to validate"
  exit 0
fi

# Check 'model' field if present
if echo "$FRONTMATTER" | grep -q "^model:"; then
  MODEL=$(echo "$FRONTMATTER" | grep "^model:" | cut -d: -f2 | tr -d ' ')
  if ! echo "sonnet opus haiku" | grep -qw "$MODEL"; then
    echo "ERROR: Invalid model '$MODEL' (must be sonnet, opus, or haiku)"
    exit 1
  fi
  echo "✓ Model field valid: $MODEL"
fi

# Check 'allowed-tools' field format
if echo "$FRONTMATTER" | grep -q "^allowed-tools:"; then
  echo "✓ allowed-tools field present"
  # Could add more sophisticated validation here
fi

# Check 'description' length
if echo "$FRONTMATTER" | grep -q "^description:"; then
  DESC=$(echo "$FRONTMATTER" | grep "^description:" | cut -d: -f2-)
  LENGTH=${#DESC}
  if [ "$LENGTH" -gt 80 ]; then
    echo "WARNING: Description length $LENGTH (recommend < 60 chars)"
  else
    echo "✓ Description length acceptable: $LENGTH chars"
  fi
fi

echo "✓ Frontmatter fields valid"
```

### Level 3: Manual Skill Invocation

**What to test:**
- Skill appears in `/help`
- Skill executes without errors
- Output is as expected

**Test procedure:**

```bash
# 1. Start Copilot CLI
copilot --debug

# 2. Check skill appears in help
> /help
# Look for your skill in the list

# 3. Invoke skill without arguments
> /my-command
# Check for reasonable error or behavior

# 4. Invoke with valid arguments
> /my-command arg1 arg2
# Verify expected behavior

# 5. Check debug logs
tail -f ~/.copilot/debug-logs/latest
# Look for errors or warnings
```

### Level 4: Argument Testing

**What to test:**
- Positional arguments work ($1, $2, etc.)
- $ARGUMENTS captures all arguments
- Missing arguments handled gracefully
- Invalid arguments detected

**Test matrix:**

| Test Case | Command | Expected Result |
|-----------|---------|-----------------|
| No args | `/cmd` | Graceful handling or useful message |
| One arg | `/cmd arg1` | $1 substituted correctly |
| Two args | `/cmd arg1 arg2` | $1 and $2 substituted |
| Extra args | `/cmd a b c d` | All captured or extras ignored appropriately |
| Special chars | `/cmd "arg with spaces"` | Quotes handled correctly |
| Empty arg | `/cmd ""` | Empty string handled |

**Test script:**

```bash
#!/bin/bash
# test-command-arguments.sh

COMMAND="$1"

echo "Testing argument handling for /$COMMAND"
echo

echo "Test 1: No arguments"
echo "  Command: /$COMMAND"
echo "  Expected: [describe expected behavior]"
echo "  Manual test required"
echo

echo "Test 2: Single argument"
echo "  Command: /$COMMAND test-value"
echo "  Expected: 'test-value' appears in output"
echo "  Manual test required"
echo

echo "Test 3: Multiple arguments"
echo "  Command: /$COMMAND arg1 arg2 arg3"
echo "  Expected: All arguments used appropriately"
echo "  Manual test required"
echo

echo "Test 4: Special characters"
echo "  Command: /$COMMAND \"value with spaces\""
echo "  Expected: Entire phrase captured"
echo "  Manual test required"
```

### Level 5: File Reference Testing

**What to test:**
- @ syntax loads file contents
- Non-existent files handled
- Large files handled appropriately
- Multiple file references work

**Test procedure:**

```bash
# Create test files
echo "Test content" > /tmp/test-file.txt
echo "Second file" > /tmp/test-file-2.txt

# Test single file reference
> /my-command /tmp/test-file.txt
# Verify file content is read

# Test non-existent file
> /my-command /tmp/nonexistent.txt
# Verify graceful error handling

# Test multiple files
> /my-command /tmp/test-file.txt /tmp/test-file-2.txt
# Verify both files processed

# Test large file
dd if=/dev/zero of=/tmp/large-file.bin bs=1M count=100
> /my-command /tmp/large-file.bin
# Verify reasonable behavior (may truncate or warn)

# Cleanup
rm /tmp/test-file*.txt /tmp/large-file.bin
```

### Level 6: Bash Execution Testing

**What to test:**
- !` commands execute correctly
- Command output included in prompt
- Command failures handled
- Security: only allowed commands run

**Test procedure:**

```bash
# Create test skill with bash execution
cat > .github/skills/test-bash.md << 'EOF'
---
description: Test bash execution
allowed-tools: execute(echo:*), execute(date:*)
---

Current date: !`date`
Test output: !`echo "Hello from bash"`

Analysis of output above...
EOF

# Test in Copilot CLI
> /test-bash
# Verify:
# 1. Date appears correctly
# 2. Echo output appears
# 3. No errors in debug logs

# Test with disallowed command (should fail or be blocked)
cat > .github/skills/test-forbidden.md << 'EOF'
---
description: Test forbidden command
allowed-tools: execute(echo:*)
---

Trying forbidden: !`ls -la /`
EOF

> /test-forbidden
# Verify: Permission denied or appropriate error
```

### Level 7: Integration Testing

**What to test:**
- Skills work with other plugin components
- Skills interact correctly with each other
- State management works across invocations
- Workflow skills execute in sequence

**Test scenarios:**

**Scenario 1: Skill + Hook Integration**

```bash
# Setup: Skill that triggers a hook
# Test: Invoke skill, verify hook executes

# Skill: .github/skills/risky-operation.md
# Hook: preToolUse that validates the operation

> /risky-operation
# Verify: Hook executes and validates before skill completes
```

**Scenario 2: Skill Sequence**

```bash
# Setup: Multi-skill workflow
> /workflow-init
# Verify: State file created

> /workflow-step2
# Verify: State file read, step 2 executes

> /workflow-complete
# Verify: State file cleaned up
```

**Scenario 3: Skill + MCP Integration**

```bash
# Setup: Skill uses MCP tools
# Test: Verify MCP server accessible

> /mcp-command
# Verify:
# 1. MCP server starts (if stdio)
# 2. Tool calls succeed
# 3. Results included in output
```

## Automated Testing Approaches

### Skill Test Suite

Create a test suite script:

```bash
#!/bin/bash
# test-commands.sh - Skill test suite

TEST_DIR=".github/skills"
FAILED_TESTS=0

echo "Skill Test Suite"
echo "=================="
echo

for cmd_file in "$TEST_DIR"/*.md; do
  cmd_name=$(basename "$cmd_file" .md)
  echo "Testing: $cmd_name"

  # Validate structure
  if ./validate-command.sh "$cmd_file"; then
    echo "  ✓ Structure valid"
  else
    echo "  ✗ Structure invalid"
    ((FAILED_TESTS++))
  fi

  # Validate frontmatter
  if ./validate-frontmatter.sh "$cmd_file"; then
    echo "  ✓ Frontmatter valid"
  else
    echo "  ✗ Frontmatter invalid"
    ((FAILED_TESTS++))
  fi

  echo
done

echo "=================="
echo "Tests complete"
echo "Failed: $FAILED_TESTS"

exit $FAILED_TESTS
```

### Pre-Commit Hook

Validate skills before committing:

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Validating skills..."

COMMANDS_CHANGED=$(git diff --cached --name-only | grep "\.github/skills/.*\.md")

if [ -z "$COMMANDS_CHANGED" ]; then
  echo "No skills changed"
  exit 0
fi

for cmd in $COMMANDS_CHANGED; do
  echo "Checking: $cmd"

  if ! ./scripts/validate-command.sh "$cmd"; then
    echo "ERROR: Skill validation failed: $cmd"
    exit 1
  fi
done

echo "✓ All skills valid"
```

### Continuous Testing

Test skills in CI/CD:

```yaml
# .github/workflows/test-commands.yml
name: Test Skills

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Validate skill structure
        run: |
          for cmd in .github/skills/*.md; do
            echo "Testing: $cmd"
            ./scripts/validate-command.sh "$cmd"
          done

      - name: Validate frontmatter
        run: |
          for cmd in .github/skills/*.md; do
            ./scripts/validate-frontmatter.sh "$cmd"
          done

      - name: Check for TODOs
        run: |
          if grep -r "TODO" .github/skills/; then
            echo "ERROR: TODOs found in skills"
            exit 1
          fi
```

## Edge Case Testing

### Test Edge Cases

**Empty arguments:**
```bash
> /cmd ""
> /cmd '' ''
```

**Special characters:**
```bash
> /cmd "arg with spaces"
> /cmd arg-with-dashes
> /cmd arg_with_underscores
> /cmd arg/with/slashes
> /cmd 'arg with "quotes"'
```

**Long arguments:**
```bash
> /cmd $(python -c "print('a' * 10000)")
```

**Unusual file paths:**
```bash
> /cmd ./file
> /cmd ../file
> /cmd ~/file
> /cmd "/path with spaces/file"
```

**Bash command edge cases:**
```markdown
# Commands that might fail
!`exit 1`
!`false`
!`command-that-does-not-exist`

# Commands with special output
!`echo ""`
!`cat /dev/null`
!`yes | head -n 1000000`
```

## Performance Testing

### Response Time Testing

```bash
#!/bin/bash
# test-command-performance.sh

COMMAND="$1"

echo "Testing performance of /$COMMAND"
echo

for i in {1..5}; do
  echo "Run $i:"
  START=$(date +%s%N)

  # Invoke skill (manual step - record time)
  echo "  Invoke: /$COMMAND"
  echo "  Start time: $START"
  echo "  (Record end time manually)"
  echo
done

echo "Analyze results:"
echo "  - Average response time"
echo "  - Variance"
echo "  - Acceptable threshold: < 3 seconds for fast skills"
```

### Resource Usage Testing

```bash
# Monitor Copilot CLI during skill execution
# In terminal 1:
copilot --debug

# In terminal 2:
watch -n 1 'ps aux | grep copilot'

# Execute skill and observe:
# - Memory usage
# - CPU usage
# - Process count
```

## User Experience Testing

### Usability Checklist

- [ ] Skill name is intuitive
- [ ] Description is clear in `/help`
- [ ] Arguments are well-documented
- [ ] Error messages are helpful
- [ ] Output is formatted readably
- [ ] Long-running skills show progress
- [ ] Results are actionable
- [ ] Edge cases have good UX

### User Acceptance Testing

Recruit testers:

```markdown
# Testing Guide for Beta Testers

## Skill: /my-new-command

### Test Scenarios

1. **Basic usage:**
   - Run: `/my-new-command`
   - Expected: [describe]
   - Rate clarity: 1-5

2. **With arguments:**
   - Run: `/my-new-command arg1 arg2`
   - Expected: [describe]
   - Rate usefulness: 1-5

3. **Error case:**
   - Run: `/my-new-command invalid-input`
   - Expected: Helpful error message
   - Rate error message: 1-5

### Feedback Questions

1. Was the skill easy to understand?
2. Did the output meet your expectations?
3. What would you change?
4. Would you use this skill regularly?
```

## Testing Checklist

Before releasing a skill:

### Structure
- [ ] File in correct location
- [ ] Correct .md extension
- [ ] Valid YAML frontmatter (if present)
- [ ] Markdown syntax correct

### Functionality
- [ ] Skill appears in `/help`
- [ ] Description is clear
- [ ] Skill executes without errors
- [ ] Arguments work as expected
- [ ] File references work
- [ ] Bash execution works (if used)

### Edge Cases
- [ ] Missing arguments handled
- [ ] Invalid arguments detected
- [ ] Non-existent files handled
- [ ] Special characters work
- [ ] Long inputs handled

### Integration
- [ ] Works with other skills
- [ ] Works with hooks (if applicable)
- [ ] Works with MCP (if applicable)
- [ ] State management works

### Quality
- [ ] Performance acceptable
- [ ] No security issues
- [ ] Error messages helpful
- [ ] Output formatted well
- [ ] Documentation complete

### Distribution
- [ ] Tested by others
- [ ] Feedback incorporated
- [ ] README updated
- [ ] Examples provided

## Debugging Failed Tests

### Common Issues and Solutions

**Issue: Skill not appearing in /help**

```bash
# Check file location
ls -la .github/skills/my-command.md

# Check permissions
chmod 644 .github/skills/my-command.md

# Check syntax
head -n 20 .github/skills/my-command.md

# Restart Copilot CLI
copilot --debug
```

**Issue: Arguments not substituting**

```bash
# Verify syntax
grep '\$1' .github/skills/my-command.md
grep '\$ARGUMENTS' .github/skills/my-command.md

# Test with simple skill first
echo "Test: \$1 and \$2" > .github/skills/test-args.md
```

**Issue: Bash commands not executing**

```bash
# Check allowed-tools
grep "allowed-tools" .github/skills/my-command.md

# Verify command syntax
grep '!\`' .github/skills/my-command.md

# Test command manually
date
echo "test"
```

**Issue: File references not working**

```bash
# Check @ syntax
grep '@' .github/skills/my-command.md

# Verify file exists
ls -la /path/to/referenced/file

# Check permissions
chmod 644 /path/to/referenced/file
```

## Best Practices

1. **Test early, test often**: Validate as you develop
2. **Automate validation**: Use scripts for repeatable checks
3. **Test edge cases**: Don't just test the happy path
4. **Get feedback**: Have others test before wide release
5. **Document tests**: Keep test scenarios for regression testing
6. **Monitor in production**: Watch for issues after release
7. **Iterate**: Improve based on real usage data
