import { joinSession } from "@github/copilot-sdk/extension";
import { createServer } from "node:http";
import { exec } from "node:child_process";

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
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Copilot Kanban Dashboard</title>
<style>
  :root {
    --bg: #0d1117;
    --surface: #161b22;
    --card: #21262d;
    --border: #30363d;
    --text: #e6edf3;
    --text-dim: #8b949e;
    --blue: #1f6feb;
    --blue-bg: #1f6feb22;
    --green: #238636;
    --green-bg: #23863622;
    --red: #da3633;
    --red-bg: #da363322;
    --yellow: #d29922;
    --yellow-bg: #d2992222;
    --purple: #8957e5;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
  }

  header {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  header h1 { font-size: 18px; font-weight: 600; }
  header h1 span { color: var(--text-dim); font-weight: 400; margin-left: 8px; font-size: 14px; }

  .connection-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--green); display: inline-block;
    margin-right: 6px; animation: pulse 2s infinite;
  }
  .connection-dot.disconnected { background: var(--red); animation: none; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

  .stats-bar {
    display: flex;
    gap: 24px;
    padding: 12px 24px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 80px;
  }
  .stat-value { font-size: 24px; font-weight: 700; line-height: 1.2; }
  .stat-label { font-size: 11px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px; }
  .stat-value.blue { color: var(--blue); }
  .stat-value.green { color: var(--green); }
  .stat-value.red { color: var(--red); }
  .stat-value.purple { color: var(--purple); }

  .main-layout {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 0;
    min-height: calc(100vh - 110px);
  }

  .kanban {
    display: flex;
    gap: 16px;
    padding: 20px 24px;
    overflow-x: auto;
    align-items: flex-start;
  }

  .column {
    flex: 1;
    min-width: 260px;
    max-width: 400px;
    background: var(--surface);
    border-radius: 12px;
    border: 1px solid var(--border);
    overflow: hidden;
  }

  .column-header {
    padding: 12px 16px;
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid var(--border);
  }
  .column-header .count {
    background: var(--card);
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 12px;
    color: var(--text-dim);
  }

  .column.running .column-header { border-bottom-color: var(--blue); }
  .column.done .column-header { border-bottom-color: var(--green); }
  .column.failed .column-header { border-bottom-color: var(--red); }

  .column-cards {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 60px;
  }

  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px;
    transition: border-color 0.2s, transform 0.2s;
    animation: fadeIn 0.3s ease;
  }
  .card:hover { border-color: var(--text-dim); transform: translateY(-1px); }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

  .card-name { font-size: 14px; font-weight: 600; margin-bottom: 6px; word-break: break-word; }
  .card-desc { font-size: 12px; color: var(--text-dim); margin-bottom: 8px; }

  .card-meta {
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: var(--text-dim);
  }
  .card-meta span { display: flex; align-items: center; gap: 4px; }

  .card.running { border-left: 3px solid var(--blue); }
  .card.done { border-left: 3px solid var(--green); }
  .card.failed { border-left: 3px solid var(--red); }

  .card-error {
    background: var(--red-bg);
    color: var(--red);
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 4px;
    margin-top: 6px;
    word-break: break-word;
  }

  .empty-state {
    color: var(--text-dim);
    font-size: 13px;
    text-align: center;
    padding: 20px;
    font-style: italic;
  }

  .sidebar {
    background: var(--surface);
    border-left: 1px solid var(--border);
    padding: 20px 16px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .panel { }
  .panel-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-dim);
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .tool-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    font-size: 13px;
    border-bottom: 1px solid var(--border);
  }
  .tool-row:last-child { border-bottom: none; }
  .tool-name { font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace; font-size: 12px; }
  .tool-count { color: var(--text-dim); font-size: 12px; }
  .tool-bar {
    height: 4px;
    border-radius: 2px;
    background: var(--border);
    margin-top: 4px;
    overflow: hidden;
  }
  .tool-bar-fill { height: 100%; border-radius: 2px; background: var(--blue); transition: width 0.3s; }
  .tool-bar-fail { height: 100%; border-radius: 2px; background: var(--red); float: right; }

  .model-change {
    font-size: 12px;
    padding: 6px 0;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
  }
  .model-change:last-child { border-bottom: none; }
  .model-change .arrow { color: var(--purple); margin: 0 4px; }
  .model-change .time { color: var(--text-dim); font-size: 11px; }

  .error-entry {
    background: var(--red-bg);
    border: 1px solid var(--red);
    border-radius: 6px;
    padding: 8px 10px;
    font-size: 12px;
    margin-bottom: 6px;
    word-break: break-word;
  }
  .error-entry .error-time { color: var(--text-dim); font-size: 11px; }
  .error-entry .error-type { color: var(--red); font-weight: 600; }

  .none-text { color: var(--text-dim); font-size: 13px; font-style: italic; }

  @media (max-width: 900px) {
    .main-layout { grid-template-columns: 1fr; }
    .sidebar { border-left: none; border-top: 1px solid var(--border); }
    .kanban { flex-direction: column; }
    .column { max-width: none; }
  }
</style>
</head>
<body>

<header>
  <h1>📋 Copilot Kanban<span id="session-duration"></span></h1>
  <div style="display:flex;align-items:center;font-size:13px;color:var(--text-dim)">
    <span class="connection-dot" id="conn-dot"></span>
    <span id="conn-status">Connecting…</span>
  </div>
</header>

<div class="stats-bar" id="stats-bar">
  <div class="stat"><span class="stat-value blue" id="s-duration">0s</span><span class="stat-label">Duration</span></div>
  <div class="stat"><span class="stat-value" id="s-model">—</span><span class="stat-label">Model</span></div>
  <div class="stat"><span class="stat-value" id="s-user-msgs">0</span><span class="stat-label">User Msgs</span></div>
  <div class="stat"><span class="stat-value" id="s-turns">0</span><span class="stat-label">Turns</span></div>
  <div class="stat"><span class="stat-value green" id="s-tools-ok">0</span><span class="stat-label">Tools ✅</span></div>
  <div class="stat"><span class="stat-value red" id="s-tools-fail">0</span><span class="stat-label">Tools ❌</span></div>
  <div class="stat"><span class="stat-value purple" id="s-agents">0</span><span class="stat-label">Agents</span></div>
  <div class="stat"><span class="stat-value red" id="s-errors">0</span><span class="stat-label">Errors</span></div>
</div>

<div class="main-layout">
  <div class="kanban">
    <div class="column running">
      <div class="column-header">🔄 Running <span class="count" id="cnt-running">0</span></div>
      <div class="column-cards" id="col-running"></div>
    </div>
    <div class="column done">
      <div class="column-header">✅ Done <span class="count" id="cnt-done">0</span></div>
      <div class="column-cards" id="col-done"></div>
    </div>
    <div class="column failed">
      <div class="column-header">❌ Failed <span class="count" id="cnt-failed">0</span></div>
      <div class="column-cards" id="col-failed"></div>
    </div>
  </div>

  <aside class="sidebar">
    <div class="panel">
      <div class="panel-title">🔧 Tool Usage</div>
      <div id="tool-panel"></div>
    </div>
    <div class="panel">
      <div class="panel-title">🔄 Model Changes</div>
      <div id="model-panel"></div>
    </div>
    <div class="panel">
      <div class="panel-title">❌ Errors</div>
      <div id="error-panel"></div>
    </div>
  </aside>
</div>

<script>
const $ = (id) => document.getElementById(id);

let state = null;

function renderAgentCard(agent) {
  const card = document.createElement('div');
  card.className = \`card \${agent.status}\`;

  let inner = \`<div class="card-name">\${esc(agent.name || agent.id)}</div>\`;
  if (agent.description) inner += \`<div class="card-desc">\${esc(agent.description)}</div>\`;
  inner += \`<div class="card-meta">
    <span>🔧 \${agent.toolCalls}</span>
    <span>⏱ \${esc(agent.duration)}</span>
  </div>\`;
  if (agent.error) inner += \`<div class="card-error">❌ \${esc(agent.error)}</div>\`;

  card.innerHTML = inner;
  return card;
}

function renderToolPanel(tools) {
  if (!tools.breakdown || tools.breakdown.length === 0) return '<span class="none-text">No tools used yet</span>';
  const maxCount = Math.max(...tools.breakdown.map(t => t.count));
  return tools.breakdown.map(t => {
    const pct = maxCount > 0 ? (t.success / maxCount * 100) : 0;
    const failPct = maxCount > 0 ? (t.failed / maxCount * 100) : 0;
    return \`<div class="tool-row">
      <span class="tool-name">\${esc(t.name)}</span>
      <span class="tool-count">\${t.count} (\${t.success}✅ \${t.failed}❌)</span>
    </div>
    <div class="tool-bar"><div class="tool-bar-fill" style="width:\${pct}%"></div></div>\`;
  }).join('');
}

function renderModelPanel(changes) {
  if (!changes || changes.length === 0) return '<span class="none-text">No model changes</span>';
  return changes.map(c => {
    const time = c.timestamp ? c.timestamp.split('T')[1]?.slice(0, 8) : '';
    return \`<div class="model-change">
      <span>\${shortModel(c.from)} <span class="arrow">→</span> \${shortModel(c.to)}</span>
      <span class="time">\${time}</span>
    </div>\`;
  }).join('');
}

function renderErrorPanel(errors) {
  if (!errors || errors.length === 0) return '<span class="none-text">No errors</span>';
  return errors.map(e => {
    const time = e.timestamp ? e.timestamp.split('T')[1]?.slice(0, 8) : '';
    return \`<div class="error-entry">
      <span class="error-time">\${time}</span> <span class="error-type">\${esc(e.type)}</span>: \${esc(e.message)}
    </div>\`;
  }).join('');
}

function shortModel(name) {
  if (!name) return '?';
  return name.replace('claude-', 'c-').replace('gpt-', 'g-').replace('-preview', '');
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function update(data) {
  state = data;

  // Stats bar
  $('s-duration').textContent = data.session.duration;
  $('session-duration').textContent = \` · \${data.session.duration}\`;
  $('s-model').textContent = shortModel(data.session.currentModel);
  $('s-model').style.fontSize = '16px';
  $('s-user-msgs').textContent = data.messages.user;
  $('s-turns').textContent = data.messages.turns;
  $('s-tools-ok').textContent = data.tools.success;
  $('s-tools-fail').textContent = data.tools.failed;
  $('s-agents').textContent = data.agents.length;
  $('s-errors').textContent = data.errors.length;

  // Kanban columns
  const grouped = { running: [], done: [], failed: [] };
  data.agents.forEach(a => {
    (grouped[a.status] || grouped.running).push(a);
  });

  for (const status of ['running', 'done', 'failed']) {
    const col = $(\`col-\${status}\`);
    const cnt = $(\`cnt-\${status}\`);
    cnt.textContent = grouped[status].length;
    col.innerHTML = '';
    if (grouped[status].length === 0) {
      col.innerHTML = '<div class="empty-state">No agents</div>';
    } else {
      grouped[status].forEach(a => col.appendChild(renderAgentCard(a)));
    }
  }

  // Sidebar panels
  $('tool-panel').innerHTML = renderToolPanel(data.tools);
  $('model-panel').innerHTML = renderModelPanel(data.modelChanges);
  $('error-panel').innerHTML = renderErrorPanel(data.errors);
}

// SSE connection
function connect() {
  const dot = $('conn-dot');
  const status = $('conn-status');

  const es = new EventSource('/api/events');

  es.onopen = () => {
    dot.className = 'connection-dot';
    status.textContent = 'Connected';
  };

  es.onmessage = (e) => {
    try { update(JSON.parse(e.data)); } catch {}
  };

  es.onerror = () => {
    dot.className = 'connection-dot disconnected';
    status.textContent = 'Reconnecting…';
    es.close();
    setTimeout(connect, 3000);
  };
}

connect();

// Duration auto-update (every second)
setInterval(() => {
  if (!state) return;
  const ms = Date.now() - new Date(state.session.startedAt).getTime();
  const dur = formatDur(ms);
  $('s-duration').textContent = dur;
  $('session-duration').textContent = \` · \${dur}\`;
  // Update running agent durations
  state.agents.forEach(a => {
    if (a.status === 'running') {
      a.duration = formatDur(Date.now() - new Date(a.startedAt).getTime());
    }
  });
  // Re-render running column only
  const col = $('col-running');
  const running = state.agents.filter(a => a.status === 'running');
  if (running.length > 0) {
    col.innerHTML = '';
    running.forEach(a => col.appendChild(renderAgentCard(a)));
  }
}, 1000);

function formatDur(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60), rs = s % 60;
  if (m < 60) return rs > 0 ? m + 'm ' + rs + 's' : m + 'm';
  const h = Math.floor(m / 60), rm = m % 60;
  return rm > 0 ? h + 'h ' + rm + 'm' : h + 'h';
}
</script>
</body>
</html>
`;

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
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(DASHBOARD_HTML);
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
}

// ---------------------------------------------------------------------------
// Session init
// ---------------------------------------------------------------------------
const session = await joinSession({
  tools: [showKanban, sessionDashboard, openKanban],
  hooks: { onSessionStart },
});

// Start HTTP server immediately (onSessionStart may not fire on reload)
const _port = await startServer();
session.log(`📋 Copilot Kanban loaded. Dashboard: http://127.0.0.1:${_port}`);

// Fetch initial model
try {
  const { modelId } = await session.rpc.model.getCurrent();
  if (modelId) currentModel = modelId;
} catch {}

// ---------------------------------------------------------------------------
// Main agent tracking
// ---------------------------------------------------------------------------
const MAIN_AGENT_ID = "main-agent";
let mainAgentTurnTools = 0;

function ensureMainAgent() {
  if (!agents.has(MAIN_AGENT_ID)) {
    agents.set(MAIN_AGENT_ID, {
      name: "Main Agent",
      status: "running",
      startedAt: new Date().toISOString(),
      completedAt: null,
      toolCalls: 0,
      error: null,
      description: "",
    });
  }
}

session.on("user.message", () => {
  messageStats.user++;
  ensureMainAgent();
  const main = agents.get(MAIN_AGENT_ID);
  main.status = "running";
  main.completedAt = null;
  mainAgentTurnTools = 0;
  broadcast();
});

session.on("assistant.intent", (event) => {
  ensureMainAgent();
  const main = agents.get(MAIN_AGENT_ID);
  main.description = event.data?.intent || "";
  broadcast();
});

session.on("session.idle", () => {
  if (agents.has(MAIN_AGENT_ID)) {
    const main = agents.get(MAIN_AGENT_ID);
    if (main.status === "running") {
      main.status = "done";
      main.completedAt = new Date().toISOString();
    }
  }
  broadcast();
});

session.on("assistant.message", () => {
  messageStats.assistant++;
  messageStats.turns++;
  broadcast();
});
session.on("subagent.started", (event) => {
  const id = event.data?.toolCallId || `agent-${Date.now()}`;
  agents.set(id, {
    name: event.data?.agentDisplayName || event.data?.agentName || id,
    status: "running",
    startedAt: new Date().toISOString(),
    completedAt: null,
    toolCalls: 0,
    error: null,
    description: event.data?.agentDescription || "",
  });
  broadcast();
});

session.on("subagent.completed", (event) => {
  const id = event.data?.toolCallId;
  if (id && agents.has(id)) {
    const agent = agents.get(id);
    agent.status = "done";
    agent.completedAt = new Date().toISOString();
  }
  broadcast();
});

session.on("subagent.failed", (event) => {
  const id = event.data?.toolCallId;
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
  // Attribute to main agent if no sub-agent is running
  if (agents.has(MAIN_AGENT_ID) && agents.get(MAIN_AGENT_ID).status === "running") {
    agents.get(MAIN_AGENT_ID).toolCalls++;
  }
  for (const [id, agent] of agents) {
    if (id !== MAIN_AGENT_ID && agent.status === "running") agent.toolCalls++;
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

session.on("session.model_change", (event) => {
  const from = event.data?.previousModel || currentModel;
  const to = event.data?.newModel || "unknown";
  modelChanges.push({ from, to, timestamp: new Date().toISOString() });
  currentModel = to;
  broadcast();
});

session.on("assistant.usage", (event) => {
  if (event.data?.model && currentModel !== event.data.model) {
    currentModel = event.data.model;
    broadcast();
  }
});

session.on("session.error", (event) => {
  errors.push({
    type: event.data?.errorType || "unknown",
    message: event.data?.message || "Unknown error",
    timestamp: new Date().toISOString(),
  });
  broadcast();
});
