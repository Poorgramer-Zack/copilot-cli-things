import { joinSession } from "@github/copilot-sdk/extension";
import { execFile } from "node:child_process";
import { resolve, join } from "node:path";

const WORKTREE_DIR = ".fleet-worktrees";

function git(args, cwd) {
  return new Promise((res, rej) => {
    execFile("git", args, { cwd, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) rej(new Error(stderr.trim() || err.message));
      else res(stdout.trim());
    });
  });
}

const gitRoot = (cwd) => git(["rev-parse", "--show-toplevel"], cwd);
const currentBranch = (cwd) => git(["rev-parse", "--abbrev-ref", "HEAD"], cwd);

const session = await joinSession({
  tools: [
    {
      name: "fleet_worktree_setup",
      description:
        "Create isolated git worktrees for parallel fleet development. Each task gets branch fleet/<name> and its own working directory.",
      parameters: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Task ID — becomes branch suffix and directory name" },
              },
              required: ["name"],
            },
          },
          base_branch: { type: "string", description: "Branch to fork from. Default: current branch." },
        },
        required: ["tasks"],
      },
      handler: async (args) => {
        const cwd = process.cwd();
        const root = await gitRoot(cwd);
        const base = args.base_branch || (await currentBranch(cwd));
        const wtBase = resolve(root, "..", WORKTREE_DIR);
        const results = [];

        for (const task of args.tasks) {
          const branch = `fleet/${task.name}`;
          const path = join(wtBase, task.name);
          try {
            await git(["worktree", "add", "-b", branch, path, base], cwd);
            results.push({ name: task.name, branch, path, status: "created" });
            await session.log(`Worktree ready: ${branch} → ${path}`);
          } catch (e) {
            results.push({ name: task.name, branch, path, status: "failed", error: e.message });
            await session.log(`Worktree failed: ${branch}`, { level: "error" });
          }
        }

        return JSON.stringify({ base_branch: base, worktree_base: wtBase, worktrees: results }, null, 2);
      },
    },
    {
      name: "fleet_worktree_merge",
      description:
        "Merge fleet branches back into base branch sequentially with --no-ff. Stops on first conflict for manual resolution.",
      parameters: {
        type: "object",
        properties: {
          branches: {
            type: "array",
            items: { type: "string" },
            description: "Branch names to merge (e.g. 'fleet/auth')",
          },
          base_branch: { type: "string", description: "Target branch. Default: current branch." },
        },
        required: ["branches"],
      },
      handler: async (args) => {
        const cwd = process.cwd();
        const base = args.base_branch || (await currentBranch(cwd));
        await git(["checkout", base], cwd);

        const results = [];
        for (const branch of args.branches) {
          try {
            await git(["merge", branch, "--no-ff", "-m", `merge: ${branch}`], cwd);
            results.push({ branch, status: "merged" });
            await session.log(`Merged: ${branch}`);
          } catch (e) {
            results.push({ branch, status: "conflict", error: e.message });
            await session.log(`Conflict on ${branch} — resolve manually`, { level: "warning" });
            try { await git(["merge", "--abort"], cwd); } catch {}
            break;
          }
        }

        return JSON.stringify({ base_branch: base, results }, null, 2);
      },
    },
    {
      name: "fleet_worktree_cleanup",
      description: "Remove fleet worktrees and delete their branches.",
      parameters: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            items: { type: "string" },
            description: "Task names to clean up",
          },
          delete_branches: { type: "boolean", description: "Also delete fleet/* branches. Default: true." },
        },
        required: ["tasks"],
      },
      handler: async (args) => {
        const cwd = process.cwd();
        const root = await gitRoot(cwd);
        const wtBase = resolve(root, "..", WORKTREE_DIR);
        const delBranch = args.delete_branches !== false;
        const results = [];

        for (const task of args.tasks) {
          const path = join(wtBase, task);
          const branch = `fleet/${task}`;
          try {
            await git(["worktree", "remove", path, "--force"], cwd);
            if (delBranch) {
              try { await git(["branch", "-D", branch], cwd); } catch {}
            }
            results.push({ task, status: "cleaned" });
            await session.log(`Cleaned: ${task}`);
          } catch (e) {
            results.push({ task, status: "failed", error: e.message });
          }
        }

        return JSON.stringify({ results }, null, 2);
      },
    },
  ],
});

await session.log("Fleet Worktree extension loaded");
