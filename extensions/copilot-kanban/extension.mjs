import { joinSession } from "@github/copilot-sdk/extension";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// State tracking
// ---------------------------------------------------------------------------
const agents = new Map();
const toolStats = { total: 0, success: 0, failed: 0, byName: new Map() };
const messageStats = { user: 0, assistant: 0, turns: 0 };
let currentModel = "unknown";
const modelChanges = [];
const errors = [];
let sessionStartTime = Date.now();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function agentDuration(agent) {
  const start = new Date(agent.startedAt).getTime();
  const end = agent.completedAt ? new Date(agent.completedAt).getTime() : Date.now();
  return formatDuration(end - start);
}

function getStateSnapshot() {
  const agentList = [];
  for (const [id, a] of agents) {
    agentList.push({ id, ...a, duration: agentDuration(a) });
  }
  const toolBreakdown = [];
  for (const [name, s] of toolStats.byName) {
    toolBreakdown.push({ name, ...s });
  }
  toolBreakdown.sort((a, b) => b.count - a.count);

  return {
    session: {
      duration: formatDuration(Date.now() - sessionStartTime),
      durationMs: Date.now() - sessionStartTime,
      startedAt: new Date(sessionStartTime).toISOString(),
      currentModel,
    },
    agents: agentList,
    messages: { ...messageStats },
    tools: {
      total: toolStats.total,
      success: toolStats.success,
      failed: toolStats.failed,
      breakdown: toolBreakdown,
    },
    modelChanges: [...modelChanges],
    errors: [...errors],
  };
}

// ---------------------------------------------------------------------------
// Web Server (HTTP + SSE)
// ---------------------------------------------------------------------------
const sseClients = new Set();
let serverPort = null;
let dashboardHtml = null;

function broadcast() {
  if (sseClients.size === 0) return;
  const data = `data: ${JSON.stringify(getStateSnapshot())}\n\n`;
  for (const res of sseClients) {
    try { res.write(data); } catch { sseClients.delete(res); }
  }
}

function startServer(port = 19741) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      if (req.url === "/api/events") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
        });
        res.write(`data: ${JSON.stringify(getStateSnapshot())}\n\n`);
        sseClients.add(res);
        req.on("close", () => sseClients.delete(res));
        return;
      }

      if (req.url === "/api/state") {
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify(getStateSnapshot()));
        return;
      }

      // Serve dashboard HTML
      if (!dashboardHtml) {
        try {
          dashboardHtml = readFileSync(join(__dirname, "dashboard.html"), "utf-8");
        } catch {
          dashboardHtml = "<h1>Dashboard file not found</h1>";
        }
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(dashboardHtml);
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        resolve(startServer(port + 1));
      }
    });

    server.listen(port, "127.0.0.1", () => {
      serverPort = port;
      resolve(port);
    });
  });
}

function openBrowser(url) {
  const cmd = process.platform === "win32" ? `start "" "${url}"`
    : process.platform === "darwin" ? `open "${url}"`
    : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------
const showKanban = {
  name: "show_kanban",
  description:
    "Display a text-based kanban board of agents/subagents organized by status columns, plus a session summary line.",
  parameters: { type: "object", properties: {} },
  handler: async () => {
    const grouped = { running: [], done: [], failed: [], queued: [] };
    for (const [id, agent] of agents) {
      (grouped[agent.status] || grouped.queued).push({ id, ...agent });
    }

    const renderCard = (a) => {
      const name = a.name || a.id;
      const dur = agentDuration(a);
      const header = `  ┌─ ${name} ${"─".repeat(Math.max(1, 36 - name.length))}┐`;
      const body = a.status === "failed"
        ? `  │ 🔧 Tools: ${a.toolCalls}  ❌ ${a.error || "Error"}`.padEnd(header.length - 1) + "│"
        : `  │ 🔧 Tools: ${a.toolCalls}  ⏱ ${dur}`.padEnd(header.length - 1) + "│";
      const footer = `  └${"─".repeat(header.length - 4)}┘`;
      return [header, body, footer].join("\n");
    };

    const renderColumn = (emoji, label, items) => {
      const lines = [`${emoji} ${label} (${items.length})`];
      if (items.length === 0) lines.push("  (none)");
      else items.forEach((a) => lines.push(renderCard(a)));
      return lines.join("\n");
    };

    const elapsed = formatDuration(Date.now() - sessionStartTime);
    const summary = `📊 Session: ${elapsed} | 👤 ${messageStats.user} msgs | 🤖 ${messageStats.turns} turns | 🔧 ${toolStats.total} tools (${toolStats.success}✅ ${toolStats.failed}❌) | 🧠 ${currentModel}`;

    const board = [
      "📋 Copilot Kanban Board",
      "━".repeat(44),
      "",
      renderColumn("🔄", "RUNNING", grouped.running),
      "",
      renderColumn("✅", "DONE", grouped.done),
      "",
      renderColumn("❌", "FAILED", grouped.failed),
    ];

    if (grouped.queued.length > 0) {
      board.push("", renderColumn("⏳", "QUEUED", grouped.queued));
    }
    if (agents.size === 0) {
      board.splice(3, 0, "No agents tracked yet. Agents will appear here as subagents are spawned.", "");
    }

    board.push("", summary);
    if (serverPort) board.push(`\n🌐 Web dashboard: http://127.0.0.1:${serverPort}`);
    return board.join("\n");
  },
};

const sessionDashboard = {
  name: "session_dashboard",
  description:
    "Show comprehensive session statistics including duration, messages, tool usage breakdown, model changes, agent summary, and errors.",
  parameters: { type: "object", properties: {} },
  handler: async () => {
    const elapsed = formatDuration(Date.now() - sessionStartTime);

    const toolBreakdown = [...toolStats.byName.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, s]) => `  ${name.padEnd(14)}${s.count} calls (${s.success}✅ ${s.failed}❌)`)
      .join("\n");

    const agentCounts = { running: 0, done: 0, failed: 0, queued: 0 };
    for (const agent of agents.values()) {
      agentCounts[agent.status] = (agentCounts[agent.status] || 0) + 1;
    }

    const modelSection = modelChanges.length > 0
      ? modelChanges.map((c) => {
          const time = c.timestamp.split("T")[1]?.slice(0, 8) || c.timestamp;
          return `  ${c.from} → ${c.to} (${time})`;
        }).join("\n")
      : "  (none)";

    const errorSection = errors.length > 0
      ? errors.map((e) => {
          const time = e.timestamp.split("T")[1]?.slice(0, 8) || e.timestamp;
          return `  [${time}] ${e.type}: ${e.message}`;
        }).join("\n")
      : "  (none)";

    const lines = [
      "📊 Session Dashboard",
      "━".repeat(44),
      "",
      `⏱ Duration: ${elapsed}`,
      `🧠 Current Model: ${currentModel}`,
      "",
      "💬 Messages",
      `  👤 User: ${messageStats.user}`,
      `  🤖 Assistant: ${messageStats.assistant}`,
      `  📝 Turns: ${messageStats.turns}`,
      "",
      `🔧 Tool Usage (${toolStats.total} total — ${toolStats.success}✅ ${toolStats.failed}❌)`,
      toolBreakdown || "  (none)",
      "",
      `🔄 Model Changes (${modelChanges.length})`,
      modelSection,
      "",
      `🤖 Agents: ${agents.size} total (${agentCounts.running} running, ${agentCounts.done} done, ${agentCounts.failed} failed)`,
      "",
      `❌ Errors (${errors.length})`,
      errorSection,
    ];

    if (serverPort) lines.push("", `🌐 Web dashboard: http://127.0.0.1:${serverPort}`);
    return lines.join("\n");
  },
};

const openKanban = {
  name: "open_kanban",
  description:
    "Open the Copilot Kanban web dashboard in the default browser. " +
    "The dashboard provides a real-time kanban board with agent cards, session stats, tool usage, and model change history.",
  parameters: { type: "object", properties: {} },
  handler: async () => {
    if (!serverPort) {
      return { textResultForLlm: "Web server not started yet. Try again shortly.", resultType: "failure" };
    }
    const url = `http://127.0.0.1:${serverPort}`;
    openBrowser(url);
    return `🌐 Dashboard opened: ${url}`;
  },
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
async function onSessionStart() {
  sessionStartTime = Date.now();
  const port = await startServer();
  session.log(`📋 Copilot Kanban loaded. Dashboard: http://127.0.0.1:${port}`);
}

// ---------------------------------------------------------------------------
// Session init
// ---------------------------------------------------------------------------
const session = await joinSession({
  tools: [showKanban, sessionDashboard, openKanban],
  hooks: { onSessionStart },
});

// ---------------------------------------------------------------------------
// Event listeners — broadcast to SSE clients after each state change
// ---------------------------------------------------------------------------
session.on("subagent.started", (event) => {
  const id = event.data?.id || event.data?.agentId || `agent-${Date.now()}`;
  agents.set(id, {
    name: event.data?.name || event.data?.agentName || id,
    status: "running",
    startedAt: new Date().toISOString(),
    completedAt: null,
    toolCalls: 0,
    error: null,
    description: event.data?.description || "",
  });
  broadcast();
});

session.on("subagent.completed", (event) => {
  const id = event.data?.id || event.data?.agentId;
  if (id && agents.has(id)) {
    const agent = agents.get(id);
    agent.status = "done";
    agent.completedAt = new Date().toISOString();
  }
  broadcast();
});

session.on("subagent.failed", (event) => {
  const id = event.data?.id || event.data?.agentId;
  if (id && agents.has(id)) {
    const agent = agents.get(id);
    agent.status = "failed";
    agent.completedAt = new Date().toISOString();
    agent.error = event.data?.error || "Unknown error";
  }
  broadcast();
});

session.on("tool.execution_start", (event) => {
  const name = event.data?.toolName || "unknown";
  toolStats.total++;
  const existing = toolStats.byName.get(name) || { count: 0, success: 0, failed: 0 };
  existing.count++;
  toolStats.byName.set(name, existing);
  for (const agent of agents.values()) {
    if (agent.status === "running") agent.toolCalls++;
  }
  broadcast();
});

session.on("tool.execution_complete", (event) => {
  const name = event.data?.toolName || "unknown";
  const ok = event.data?.success !== false;
  if (ok) toolStats.success++;
  else toolStats.failed++;
  const existing = toolStats.byName.get(name);
  if (existing) {
    if (ok) existing.success++;
    else existing.failed++;
  }
  broadcast();
});

session.on("user.message", () => { messageStats.user++; broadcast(); });
session.on("assistant.message", () => { messageStats.assistant++; messageStats.turns++; broadcast(); });

session.on("session.model_change", (event) => {
  const from = event.data?.previousModel || currentModel;
  const to = event.data?.newModel || event.model || "unknown";
  modelChanges.push({ from, to, timestamp: new Date().toISOString() });
  currentModel = to;
  broadcast();
});

session.on("session.error", (event) => {
  errors.push({
    type: event.data?.errorType || "unknown",
    message: event.data?.message || "Unknown error",
    timestamp: new Date().toISOString(),
  });
  broadcast();
});
