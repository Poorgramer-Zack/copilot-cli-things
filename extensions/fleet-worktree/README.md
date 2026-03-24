# Fleet Worktree

Git worktree management for Copilot CLI fleet mode — each parallel task gets an isolated branch and working directory.

## What It Does

When fleet mode dispatches parallel tasks, this extension creates separate [git worktrees](https://git-scm.com/docs/git-worktree) so each task works in its own directory on its own branch, eliminating file conflicts between concurrent agents.

## Tools

| Tool | Description |
|------|-------------|
| `fleet_worktree_setup` | Create `fleet/<name>` branches and worktrees for each task |
| `fleet_worktree_merge` | Merge fleet branches back into base with `--no-ff` (stops on conflict) |
| `fleet_worktree_cleanup` | Remove worktrees and delete fleet branches |

## Workflow

```
1. Setup    → creates .fleet-worktrees/<task>/ directories alongside the repo
2. Work     → each agent operates in its isolated worktree
3. Merge    → sequential --no-ff merge back to base branch
4. Cleanup  → remove worktrees and branches
```

## Install

```bash
# Project-level
cp -r extensions/fleet-worktree your-project/.github/extensions/

# User-level
cp -r extensions/fleet-worktree ~/.copilot/extensions/
```

Restart Copilot CLI or run `/clear` to load.

## Details

- Worktrees are created at `../.fleet-worktrees/<task>/` (sibling to the repo root)
- Branches follow the `fleet/<task-name>` naming convention
- Merge stops on first conflict and aborts, allowing manual resolution
- Cleanup force-removes worktrees and optionally deletes branches
