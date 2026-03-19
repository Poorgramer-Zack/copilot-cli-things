import { joinSession } from "@github/copilot-sdk/extension";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { exec } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOME = process.env.HOME || process.env.USERPROFILE;
const CONFIG_PATH = join(HOME, ".copilot", "cron-tasks.json");

// Active tasks: Map<id, { def, timerId, lastRun, runCount }>
const activeTasks = new Map();

function loadPersistedTasks() {
  if (!existsSync(CONFIG_PATH)) return [];
  try {
    const data = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
    return data.tasks || [];
  } catch {
    return [];
  }
}

function persistTasks() {
  const tasks = [];
  for (const [id, task] of activeTasks) {
    if (task.def.persist) tasks.push(task.def);
  }
  const dir = dirname(CONFIG_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify({ tasks }, null, 2), "utf-8");
}

function parseInterval(interval) {
  const match = interval.match(/^(\d+)\s*(s|sec|second|seconds|m|min|minute|minutes|h|hour|hours)$/i);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (unit.startsWith("h")) return value * 3600 * 1000;
  if (unit.startsWith("m")) return value * 60 * 1000;
  return value * 1000;
}

function formatInterval(ms) {
  if (ms >= 3600000) return `${ms / 3600000}h`;
  if (ms >= 60000) return `${ms / 60000}m`;
  return `${ms / 1000}s`;
}

function runCommand(command, cwd) {
  return new Promise((resolve) => {
    exec(command, { cwd, timeout: 30000 }, (err, stdout, stderr) => {
      if (err) resolve({ ok: false, output: stderr || err.message });
      else resolve({ ok: true, output: stdout.trim() });
    });
  });
}

async function executeTask(id) {
  const task = activeTasks.get(id);
  if (!task || task.paused) return;

  task.lastRun = new Date().toISOString();
  task.runCount++;

  const { type, command, prompt, name } = task.def;

  if (type === "command") {
    const result = await runCommand(command, task.def.cwd || process.cwd());
    const status = result.ok ? "✅" : "❌";
    const output = result.output ? `\n${result.output.slice(0, 500)}` : "";
    session.log(`⏰ [${name}] ${status} (run #${task.runCount})${output}`);
  } else if (type === "prompt") {
    session.log(`⏰ [${name}] Sending prompt (run #${task.runCount})`);
    try {
      await session.send({ prompt });
    } catch (err) {
      session.log(`⏰ [${name}] ❌ Failed to send prompt: ${err.message}`, { level: "error" });
    }
  }
}

function startTask(def) {
  const intervalMs = parseInterval(def.interval);
  if (!intervalMs) return null;

  const id = def.id || `task-${Date.now()}`;
  def.id = id;

  const timerId = setInterval(() => executeTask(id), intervalMs);

  activeTasks.set(id, {
    def,
    timerId,
    intervalMs,
    lastRun: null,
    runCount: 0,
    paused: false,
    createdAt: new Date().toISOString(),
  });

  return id;
}

function stopTask(id) {
  const task = activeTasks.get(id);
  if (!task) return false;
  clearInterval(task.timerId);
  activeTasks.delete(id);
  return true;
}

function stopAllTasks() {
  for (const [id] of activeTasks) stopTask(id);
}

// Tool definitions
const scheduleTask = {
  name: "schedule_task",
  description:
    "Schedule a recurring task in the current session. " +
    "Tasks can be shell commands (executed periodically) or prompts (sent to the agent). " +
    "Use for automated checks (lint, tests, git status), periodic reminders, or background monitoring.",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Human-readable name for the task (e.g., 'lint-check', 'git-pull')",
      },
      type: {
        type: "string",
        enum: ["command", "prompt"],
        description: "Task type: 'command' runs a shell command, 'prompt' sends a message to the agent",
      },
      command: {
        type: "string",
        description: "The shell command to run (for type='command') or prompt text (for type='prompt')",
      },
      interval: {
        type: "string",
        description: "How often to run (e.g., '30s', '5m', '1h')",
      },
      persist: {
        type: "boolean",
        description: "Save to ~/.copilot/cron-tasks.json so it auto-starts in future sessions (default: false)",
      },
    },
    required: ["name", "type", "command", "interval"],
  },
  handler: async (args) => {
    const intervalMs = parseInterval(args.interval);
    if (!intervalMs) {
      return { textResultForLlm: `Invalid interval: "${args.interval}". Use format like "30s", "5m", "1h".`, resultType: "failure" };
    }
    if (intervalMs < 10000) {
      return { textResultForLlm: "Minimum interval is 10s to avoid excessive resource usage.", resultType: "failure" };
    }

    const def = {
      name: args.name,
      type: args.type,
      interval: args.interval,
      persist: args.persist || false,
      ...(args.type === "command" ? { command: args.command } : { prompt: args.command }),
    };

    const id = startTask(def);
    if (args.persist) persistTasks();

    session.log(`⏰ Scheduled: ${args.name} (every ${args.interval})`);

    return `⏰ Task **${args.name}** scheduled (id: ${id}, every ${args.interval}, type: ${args.type}).${args.persist ? " Persisted to ~/.copilot/cron-tasks.json." : ""}`;
  },
};

const removeTask = {
  name: "remove_task",
  description: "Stop and remove a scheduled recurring task by its ID or name.",
  parameters: {
    type: "object",
    properties: {
      task: {
        type: "string",
        description: "Task ID or name to remove",
      },
    },
    required: ["task"],
  },
  handler: async (args) => {
    // Match by ID or name
    let targetId = null;
    if (activeTasks.has(args.task)) {
      targetId = args.task;
    } else {
      for (const [id, t] of activeTasks) {
        if (t.def.name === args.task) { targetId = id; break; }
      }
    }

    if (!targetId) {
      return { textResultForLlm: `Task not found: "${args.task}"`, resultType: "failure" };
    }

    const name = activeTasks.get(targetId).def.name;
    stopTask(targetId);
    persistTasks();

    session.log(`⏰ Removed: ${name}`);
    return `⏰ Task **${name}** (${targetId}) has been stopped and removed.`;
  },
};

const listTasks = {
  name: "list_tasks",
  description: "List all active scheduled tasks with their status, interval, and run count.",
  parameters: { type: "object", properties: {} },
  handler: async () => {
    if (activeTasks.size === 0) return "No scheduled tasks.";

    const lines = ["**Active Scheduled Tasks:**", ""];
    for (const [id, task] of activeTasks) {
      const status = task.paused ? "⏸️" : "▶️";
      const persist = task.def.persist ? " 💾" : "";
      const lastRun = task.lastRun ? ` | last: ${task.lastRun}` : "";
      lines.push(
        `${status} **${task.def.name}** (${id})` +
        ` — ${task.def.type}: \`${task.def.command || task.def.prompt}\`` +
        ` — every ${formatInterval(task.intervalMs)}` +
        ` — runs: ${task.runCount}${lastRun}${persist}`
      );
    }
    return lines.join("\n");
  },
};

const pauseTask = {
  name: "pause_task",
  description: "Pause a scheduled task without removing it. Use resume_task to restart.",
  parameters: {
    type: "object",
    properties: {
      task: { type: "string", description: "Task ID or name to pause" },
    },
    required: ["task"],
  },
  handler: async (args) => {
    let target = null;
    if (activeTasks.has(args.task)) {
      target = activeTasks.get(args.task);
    } else {
      for (const [, t] of activeTasks) {
        if (t.def.name === args.task) { target = t; break; }
      }
    }

    if (!target) return { textResultForLlm: `Task not found: "${args.task}"`, resultType: "failure" };
    if (target.paused) return `⏸️ Task **${target.def.name}** is already paused.`;

    target.paused = true;
    session.log(`⏸️ Paused: ${target.def.name}`);
    return `⏸️ Task **${target.def.name}** paused. Runs will be skipped until resumed.`;
  },
};

const resumeTask = {
  name: "resume_task",
  description: "Resume a paused scheduled task.",
  parameters: {
    type: "object",
    properties: {
      task: { type: "string", description: "Task ID or name to resume" },
    },
    required: ["task"],
  },
  handler: async (args) => {
    let target = null;
    if (activeTasks.has(args.task)) {
      target = activeTasks.get(args.task);
    } else {
      for (const [, t] of activeTasks) {
        if (t.def.name === args.task) { target = t; break; }
      }
    }

    if (!target) return { textResultForLlm: `Task not found: "${args.task}"`, resultType: "failure" };
    if (!target.paused) return `▶️ Task **${target.def.name}** is already running.`;

    target.paused = false;
    session.log(`▶️ Resumed: ${target.def.name}`);
    return `▶️ Task **${target.def.name}** resumed.`;
  },
};

// Hooks
async function onSessionStart() {
  const persisted = loadPersistedTasks();
  let count = 0;
  for (const def of persisted) {
    if (startTask(def)) count++;
  }
  const msg = count > 0
    ? `Cron Task loaded. Restored ${count} persisted task(s).`
    : "Cron Task loaded. No persisted tasks.";
  session.log(`⏰ ${msg}`);
}

// Create session
const session = await joinSession({
  tools: [scheduleTask, removeTask, listTasks, pauseTask, resumeTask],
  hooks: { onSessionStart },
});

// Cleanup on shutdown
session.on("session.shutdown", () => stopAllTasks());
