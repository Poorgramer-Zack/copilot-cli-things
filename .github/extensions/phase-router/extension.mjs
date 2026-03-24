import { joinSession } from "@github/copilot-sdk/extension";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOME = process.env.HOME || process.env.USERPROFILE;
const USER_CONFIG_PATH = join(HOME, ".copilot", "phase-router.json");

const PHASE_EMOJI = {
  research: "🔍",
  planning: "📋",
  coding: "💻",
  refactoring: "♻️",
  review: "🔎",
  debugging: "🐛",
  general: "💬",
};

const VALID_PHASES = Object.keys(PHASE_EMOJI);

// State
let currentPhase = null;
let config = loadConfig();

function loadConfig() {
  const defaultConfig = JSON.parse(
    readFileSync(join(__dirname, "config.json"), "utf-8"),
  );

  if (!existsSync(USER_CONFIG_PATH)) return defaultConfig;

  try {
    const userConfig = JSON.parse(readFileSync(USER_CONFIG_PATH, "utf-8"));
    return deepMerge(defaultConfig, userConfig);
  } catch {
    return defaultConfig;
  }
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] && typeof source[key] === "object" && !Array.isArray(source[key]) &&
      target[key] && typeof target[key] === "object" && !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function saveUserConfig(updates) {
  let existing = {};
  if (existsSync(USER_CONFIG_PATH)) {
    try { existing = JSON.parse(readFileSync(USER_CONFIG_PATH, "utf-8")); } catch {}
  }
  const merged = deepMerge(existing, updates);
  const dir = dirname(USER_CONFIG_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(USER_CONFIG_PATH, JSON.stringify(merged, null, 2), "utf-8");
}

function getModelForPhase(phase) {
  return config.phases[phase]?.model || config.phases[config.defaultPhase]?.model;
}

function formatPhaseStatus(phase, model) {
  const emoji = PHASE_EMOJI[phase] || "❓";
  const lines = [`Current Phase: ${emoji} ${phase} (${model})`, "", "Available Phases:"];
  for (const name of VALID_PHASES) {
    const e = PHASE_EMOJI[name];
    const m = config.phases[name]?.model || "unknown";
    const d = config.phases[name]?.description || "";
    lines.push(`  ${e} ${name} → ${m} (${d})`);
  }
  return lines.join("\n");
}

// Tool definitions
const setPhase = {
  name: "set_phase",
  description:
    "Switch the current task phase to use the optimal AI model. " +
    "You SHOULD call this tool when you detect the user's task intent has changed. " +
    "Phase guide: research (exploration, understanding) → fast model, " +
    "planning (architecture, design) → powerful reasoning model, " +
    "coding (implementation, building) → code-specialized model, " +
    "refactoring (restructuring, cleanup) → balanced model, " +
    "review (code review, security audit) → cross-family powerful model, " +
    "debugging (bug fixing, troubleshooting) → code-specialized model, " +
    "general (conversation, other) → balanced model.",
  parameters: {
    type: "object",
    properties: {
      phase: {
        type: "string",
        enum: VALID_PHASES,
        description: "The phase to switch to",
      },
    },
    required: ["phase"],
  },
  handler: async (args) => {
    if (!VALID_PHASES.includes(args.phase)) {
      return { textResultForLlm: `Unknown phase: ${args.phase}`, resultType: "failure" };
    }

    const previousPhase = currentPhase;
    currentPhase = args.phase;
    const model = getModelForPhase(args.phase);
    await session.setModel(model);

    if (config.showNotifications) {
      session.log(`Phase Router: ${PHASE_EMOJI[args.phase]} ${args.phase} → ${model}`);
    }

    return previousPhase !== args.phase
      ? `${PHASE_EMOJI[args.phase]} Phase switched from ${previousPhase} to **${args.phase}** (model: ${model}). Model change takes effect on the next turn.`
      : `${PHASE_EMOJI[args.phase]} Phase remains **${args.phase}** (model: ${model}).`;
  },
};

const showPhase = {
  name: "show_phase",
  description:
    "Show the current phase-router status including active phase, model, and all available phase configurations.",
  parameters: { type: "object", properties: {} },
  handler: async () => {
    const phase = currentPhase || config.defaultPhase;
    return formatPhaseStatus(phase, getModelForPhase(phase));
  },
};

const configurePhase = {
  name: "configure_phase",
  description:
    "Update the model assigned to a specific phase. Changes are saved to ~/.copilot/phase-router.json for persistence across sessions.",
  parameters: {
    type: "object",
    properties: {
      phase: { type: "string", enum: VALID_PHASES, description: "The phase to configure" },
      model: {
        type: "string",
        description: "The model ID to use (e.g., 'claude-sonnet-4.6', 'claude-opus-4.6', 'gpt-5.1')",
      },
    },
    required: ["phase", "model"],
  },
  handler: async (args) => {
    if (!VALID_PHASES.includes(args.phase)) {
      return { textResultForLlm: `Unknown phase: ${args.phase}`, resultType: "failure" };
    }

    config.phases[args.phase].model = args.model;
    saveUserConfig({ phases: { [args.phase]: { model: args.model } } });

    if (currentPhase === args.phase) await session.setModel(args.model);

    return `${PHASE_EMOJI[args.phase]} Phase **${args.phase}** now uses model: ${args.model}. Saved to ~/.copilot/phase-router.json`;
  },
};

// Hooks
async function onSessionStart() {
  const phase = config.defaultPhase;
  currentPhase = phase;
  await session.setModel(getModelForPhase(phase));
  session.log(`Phase Router loaded. Default: ${PHASE_EMOJI[phase]} ${phase} → ${getModelForPhase(phase)}`);
}

async function onUserPromptSubmitted(input) {
  if (!config.enabled) return;

  const phase = currentPhase || config.defaultPhase;
  const model = getModelForPhase(phase);

  const phaseList = VALID_PHASES
    .map((name) => `${PHASE_EMOJI[name]} ${name} → ${config.phases[name]?.model || "unknown"}`)
    .join(", ");

  return {
    additionalContext: [
      `[Phase Router] Current phase: ${PHASE_EMOJI[phase]} ${phase} (model: ${model}).`,
      `Available phases: ${phaseList}.`,
      "If the user's task intent has clearly changed from the current phase, call set_phase to switch.",
      "Do NOT switch if the task type matches the current phase.",
    ].join(" "),
  };
}

// Create session
const session = await joinSession({
  tools: [setPhase, showPhase, configurePhase],
  hooks: { onSessionStart, onUserPromptSubmitted },
});

// Apply default phase model on init (onSessionStart may not fire on reload)
if (!currentPhase) {
  currentPhase = config.defaultPhase;
}
const initModel = getModelForPhase(currentPhase);
await session.setModel(initModel);
session.log(`Phase Router: ${PHASE_EMOJI[currentPhase]} ${currentPhase} → ${initModel}`);

session.on("session.model_change", (event) => {
  session.log(`Phase Router: Model changed → ${event.data?.newModel || "unknown"}`);
});
