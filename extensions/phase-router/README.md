# 🔄 Phase Router

> LLM-driven intent detection + intelligent model switching — a Copilot CLI Extension

The AI agent semantically classifies the user's task intent (research, coding, review…) and switches to the optimal model via the `set_phase` tool. Inspired by [oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent)'s Sisyphus multi-agent intent classification system.

**Core idea**: Different tasks deserve different models. Use a fast, cheap model for exploration (GPT-5.4 mini), a code-specialized model for implementation (GPT-5.3 Codex), and a powerful reasoning model for architecture design (Opus). Phase Router injects phase context via `additionalContext`, letting the agent decide when to switch — works with prompts in any language.

**Cross-family strategy**: The default config intentionally mixes Claude and GPT models. Using GPT to review Claude-generated code (and vice versa) catches blind spots that same-family review would miss.

---

## ✨ Features

- ✅ **LLM-driven classification** — the agent decides intent semantically, no keyword matching, works in any language
- ✅ **Intelligent model switching** — automatically selects the best model for each task type
- ✅ **Cross-family review** — GPT reviews Claude code, different training data = different perspectives
- ✅ **Manual override** — `set_phase` tool for explicit phase control
- ✅ **Fully configurable** — customize model per phase
- ✅ **Persistent config** — settings saved to `~/.copilot/phase-router.json`

---

## 📊 Task Phases

| Phase | Emoji | Default Model | Description |
|-------|-------|---------------|-------------|
| `research` | 🔍 | `gpt-5.4-mini` | Investigation, exploration, learning |
| `planning` | 📋 | `claude-opus-4.6` | Architecture design, system planning |
| `coding` | 💻 | `gpt-5.3-codex` | Implementation, feature building |
| `refactoring` | ♻️ | `claude-sonnet-4.6` | Code restructuring, cleanup, optimization |
| `review` | 🔎 | `gpt-5.4` | Code review, security audit, quality check |
| `debugging` | 🐛 | `gpt-5.3-codex` | Bug fixing, error diagnosis, troubleshooting |
| `general` | 💬 | `claude-sonnet-4.6` | General conversation, other tasks |

---

## 📦 Installation

### Project-level (per project)

```bash
cp -r .github/extensions/phase-router your-project/.github/extensions/
```

### User-level (global)

```bash
cp -r .github/extensions/phase-router ~/.copilot/extensions/
```

Restart Copilot CLI or run `/clear` to load.

---

## 🚀 Usage

Just type your prompt normally. The agent will semantically determine whether to switch phases:

```
> explain how the auth middleware works
  → Agent detects Research intent, calls set_phase("research") → gpt-5.4-mini

> implement user registration API
  → Agent detects Coding intent, calls set_phase("coding") → gpt-5.3-codex

> review this PR for security vulnerabilities
  → Agent detects Review intent, calls set_phase("review") → gpt-5.4
```

You can also explicitly ask the agent to switch:

```
switch to planning phase
show current phase config
set the review phase to use claude-opus-4.6
```

---

## ⚙️ Configuration

| Field | Description |
|-------|-------------|
| `enabled` | Enable/disable phase switching |
| `showNotifications` | Show/hide phase switch notifications |
| `defaultPhase` | Default phase on session start |
| `phases.{name}.model` | Model to use for that phase |

### User Override

Create `~/.copilot/phase-router.json` with only the fields you want to change:

```json
{
  "phases": {
    "coding": { "model": "claude-sonnet-4.6" },
    "review": { "model": "claude-opus-4.6" }
  }
}
```

---

## 🔧 How It Works

1. User submits a prompt
2. `onUserPromptSubmitted` hook fires
3. `additionalContext` is injected with current phase info and available phases
4. Agent semantically evaluates whether intent has changed — if so, calls `set_phase`
5. `session.setModel()` switches the model (takes effect on the **next turn**)

---

## 🛠️ Available Tools

| Tool | Description |
|------|-------------|
| `set_phase` | Switch task phase — triggered by agent or user |
| `show_phase` | Show current phase status and model configuration |
| `configure_phase` | Update a phase's model and persist to config file |

---

## 💡 Model Selection Rationale

| Task Type | Recommended Tier | Why |
|-----------|-----------------|-----|
| Exploration / research | Fast & cheap (GPT-5.4 mini, Haiku) | Speed over quality, low cost |
| Implementation / debugging | Code-specialized (GPT-5.3 Codex) | Optimized for tool-driven coding workflows |
| Refactoring / general | Balanced (Sonnet) | Good quality-to-cost ratio |
| Architecture / review | Premium (Opus, GPT-5.4) | Requires strongest reasoning capabilities |

---

## ⚠️ Known Limitations

- `session.setModel()` takes effect on the **next turn**, not the current one
- Phase switching relies on the agent's semantic understanding (all modern LLMs handle this well)
- State resets to default phase on session restart or `/clear`
