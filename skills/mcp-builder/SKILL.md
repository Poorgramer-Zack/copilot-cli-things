---
name: MCP Builder
description: This skill should be used when the user asks to "build an MCP server", "create an MCP server", "implement MCP tools", "develop MCP integration", "write an MCP server in Python", "write an MCP server in TypeScript/Node", or needs guidance on MCP server development, tool design, evaluation creation, or MCP best practices.
version: 0.1.0
---

# MCP Server Development Guide

## Overview

Create MCP (Model Context Protocol) servers that enable LLMs to interact with external services through well-designed tools. The quality of an MCP server is measured by how well it enables LLMs to accomplish real-world tasks.

**Key deliverables:**
- A working MCP server with well-designed tools
- Clear tool descriptions, input schemas, and annotations
- Evaluation suite to measure tool effectiveness
- Documentation for setup and usage

---

## Phase 1: Deep Research and Planning

### 1.1 Understand Modern MCP Design

**API Coverage vs. Workflow Tools:**
Balance comprehensive API endpoint coverage with specialized workflow tools. When uncertain, prioritize comprehensive API coverage — it gives agents flexibility to compose operations.

**Tool Naming and Discoverability:**
- Use `snake_case` with service prefix: `{service}_{action}_{resource}`
- Examples: `slack_send_message`, `github_create_issue`
- Be action-oriented: start with verbs (get, list, search, create, update, delete)

**Context Management:**
Design tools that return focused, relevant data. Support pagination and filtering to avoid overwhelming responses.

**Actionable Error Messages:**
Error messages should guide agents toward solutions with specific suggestions and next steps.

### 1.2 Study MCP Protocol

Start with the sitemap: `https://modelcontextprotocol.io/sitemap.xml`
Fetch specific pages with `.md` suffix (e.g., `https://modelcontextprotocol.io/specification/draft.md`).

Key pages: specification overview, transport mechanisms (streamable HTTP, stdio), tool/resource/prompt definitions.

### 1.3 Choose Framework

**Recommended stack:**
- **Language**: TypeScript (strong SDK support, good AI code generation, static typing)
- **Transport**: Streamable HTTP for remote servers (stateless JSON), stdio for local servers

**Framework documentation:**
- 📋 [MCP Best Practices](./references/mcp-best-practices.md) — Core guidelines (load first)
- ⚡ [TypeScript Guide](./references/node-mcp-server.md) — TypeScript patterns with `@modelcontextprotocol/sdk`
- 🐍 [Python Guide](./references/python-mcp-server.md) — Python patterns with FastMCP

**SDK README (fetch via web):**
- TypeScript: `https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/main/README.md`
- Python: `https://raw.githubusercontent.com/modelcontextprotocol/python-sdk/main/README.md`

### 1.4 Plan Implementation

Review the target service's API documentation to identify key endpoints, authentication requirements, and data models. Prioritize comprehensive API coverage. List endpoints to implement, starting with the most common operations.

---

## Phase 2: Implementation

### 2.1 Project Setup

See language-specific guides for project structure, dependencies, and configuration:
- ⚡ [TypeScript Guide](./references/node-mcp-server.md) — package.json, tsconfig.json, project layout
- 🐍 [Python Guide](./references/python-mcp-server.md) — Module organization, FastMCP initialization

### 2.2 Core Infrastructure

Create shared utilities:
- API client with authentication (env vars for secrets, never hardcode)
- Error handling helpers with actionable messages
- Response formatting (JSON for programmatic, Markdown for human-readable)
- Pagination support with `limit`, `offset`, `has_more`, `next_offset`

### 2.3 Implement Tools

For each tool, define:

**Input Schema:**
- Use Zod (TypeScript) or Pydantic (Python) for runtime validation
- Include constraints, clear descriptions, and examples

**Output Schema:**
- Define `outputSchema` where possible for structured data
- Use `structuredContent` in tool responses (TypeScript SDK)

**Annotations:**
```
readOnlyHint: true/false      — Does not modify environment
destructiveHint: true/false   — May perform destructive updates
idempotentHint: true/false    — Repeated calls have no additional effect
openWorldHint: true/false     — Interacts with external entities
```

**Implementation patterns:**
- Async/await for all I/O operations
- Proper error handling with actionable messages
- Support pagination where applicable
- Return both text content and structured data

### 2.4 Server Naming

- **Python**: `{service}_mcp` (e.g., `slack_mcp`)
- **Node/TypeScript**: `{service}-mcp-server` (e.g., `slack-mcp-server`)

---

## Phase 3: Review and Test

### 3.1 Code Quality

Review for:
- No duplicated code (DRY principle)
- Consistent error handling across all tools
- Full type coverage (TypeScript strict mode, Python type hints)
- Clear, comprehensive tool descriptions

### 3.2 Build and Test

**TypeScript:**
```bash
npm run build          # Verify compilation
npx @modelcontextprotocol/inspector  # Test with MCP Inspector
```

**Python:**
```bash
python -m py_compile your_server.py  # Verify syntax
# Test with MCP Inspector
```

**Manual testing with Copilot CLI:**
Configure the server in `.github/mcp.json` and test with `copilot --debug`.

See 📋 [MCP Best Practices](./references/mcp-best-practices.md) for quality checklists.

---

## Phase 4: Create Evaluations

After implementing the MCP server, create evaluations to measure tool effectiveness.

Load ✅ [Evaluation Guide](./references/evaluation-guide.md) for complete guidelines.

### 4.1 Purpose

Evaluations test whether LLMs can effectively use your MCP server to answer realistic, complex questions using only the tools provided. Quality is measured by how well tools enable task completion, not just API coverage.

### 4.2 Create 10 Evaluation Questions

Follow the evaluation guide's process:
1. **Tool Inspection** — List available tools and understand capabilities
2. **Content Exploration** — Use READ-ONLY operations to explore available data
3. **Question Generation** — Create 10 complex, realistic questions
4. **Answer Verification** — Solve each question yourself to verify answers

### 4.3 Requirements

Each question must be:
- **Independent** — Not dependent on other questions
- **Read-only** — Only non-destructive operations required
- **Complex** — Requiring multiple tool calls and deep exploration
- **Realistic** — Based on real use cases humans would care about
- **Verifiable** — Single, clear answer verifiable by string comparison
- **Stable** — Answer will not change over time

### 4.4 Output Format

```xml
<evaluation>
  <qa_pair>
    <question>Your question here</question>
    <answer>Single verifiable answer</answer>
  </qa_pair>
  <!-- More qa_pairs... -->
</evaluation>
```

### 4.5 Running Evaluations

Use the provided evaluation harness in `scripts/`:

```bash
pip install -r scripts/requirements.txt
export ANTHROPIC_API_KEY=your_key

python scripts/evaluation.py \
  -t stdio \
  -c python \
  -a my_mcp_server.py \
  evaluation.xml
```

See `scripts/README.md` and [Evaluation Guide](./references/evaluation-guide.md) for detailed instructions.

---

## Quick Reference

### Transport Options

| Criterion | stdio | Streamable HTTP |
|-----------|-------|-----------------|
| **Deployment** | Local | Remote |
| **Clients** | Single | Multiple |
| **Complexity** | Low | Medium |
| **Real-time** | No | Yes |

### Security Considerations

- **OAuth 2.1** for production authentication
- **Environment variables** for API keys — never in code
- **Input validation** via Zod/Pydantic schemas
- **DNS rebinding protection** for local HTTP servers (bind to `127.0.0.1`)
- Sanitize file paths, validate URLs, prevent command injection

---

## Reference Files

Load these resources as needed during development:

| Resource | When to Load | Content |
|----------|-------------|---------|
| 📋 [Best Practices](./references/mcp-best-practices.md) | Phase 1-3 | Naming, responses, pagination, security, error handling |
| ⚡ [TypeScript Guide](./references/node-mcp-server.md) | Phase 2 | Project setup, Zod schemas, `registerTool`, complete examples |
| 🐍 [Python Guide](./references/python-mcp-server.md) | Phase 2 | FastMCP setup, Pydantic models, `@mcp.tool`, complete examples |
| ✅ [Evaluation Guide](./references/evaluation-guide.md) | Phase 4 | Question/answer guidelines, running evaluations |
| 📄 [Example Evaluation](./examples/example-evaluation.xml) | Phase 4 | Sample evaluation XML |
