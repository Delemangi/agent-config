# Personal Preferences

- Keep responses concise; avoid narrating routine work.
- Do not commit, amend, push, or publish PR comments/reviews unless explicitly requested. Preserve configured human Git identities; do not add AI/tool/vendor attribution, AI co-author trailers, or promotional footers unless the user requests that exact text.
- Never force-push a branch unless absolutely necessary or the user explicitly requests it.
- Before opening a new PR, issue, or similar contribution, search for existing examples and follow the repository's conventions for titles, templates, labels, and description structure.
- Before posting, submitting, editing, or deleting any PR comment or review, show the exact proposed content (or identify what would be deleted) and obtain explicit approval. A request to inspect or review a PR does not authorize publishing findings.
- Before claiming a task is complete, run the relevant tests/checks and report the exact commands and results; if something could not be verified, say so.
- Make the smallest change that satisfies the request; avoid unrelated refactors, reformatting, dependency churn, or drive-by fixes.
- Never discard, overwrite, or revert uncommitted changes you did not create. Ask before destructive filesystem, database, or process operations beyond the explicit Git rules.
- Creating Git worktrees and running read-only Git commands (`status`, `diff`, `log`, `show`, `rev-parse`, `branch --list`, `worktree list`, and similar) are always allowed; proceed without asking for confirmation.
- Installing or upgrading dependencies is allowed when a task needs them; prefer the project's package manager and lockfile.
- Do not stop processes not started for the current task without approval.
- Stop servers, watchers, tunnels, and other background processes you started when the task ends; report anything you intentionally left running and why.
- Never expose credentials, tokens, private keys, connection strings, or authentication material in output, logs, patches, commits, or tool arguments. Do not read files named exactly `.env`.

## Post-Merge Cleanup

- After a branch's work is merged, finish the task: in the primary checkout switch to the default branch (`main` unless the repository names another), update it with `git pull --ff-only`, and delete the merged branch with `git branch -d`.
- A squash- or rebase-merged branch is not ancestry-merged, so `git branch -d` refuses it. Once its PR/MR is confirmed merged (for example `gh pr view <branch> --json state,mergedAt`), delete it with `git branch -D`; the confirmed merge, not `-d`, is what makes that safe.
- Never switch to the default branch inside a linked worktree when the primary checkout already has it; remove the clean worktree with `git worktree remove` (or `git worktree prune` if its directory is already gone), then delete the branch from the primary checkout.
- Pre-authorized only when provably safe: no `--force`, no dirty worktree, no branch checked out elsewhere, and no unmerged work (a squash/rebase `-D` requires the confirmed merge above). If merge status or local changes are unclear, stop and report instead.

## Windows

- Prefer PowerShell 7 for Windows automation; use syntax appropriate to the actual shell.
- Never use Start-Process with redirected output, CMD start, or pythonw to detach persistent processes from tool calls. Use a verified background mechanism with tracked ownership and cleanup.

## Remote and SSH Sessions

- Before issuing commands over SSH, a remote shell, container, or another terminal resource, check what the terminal actually is: remote OS, shell, and whether the session is interactive.
- Do not assume the local platform, paths, quoting, or launcher conventions apply; verify the host, user, and working directory before file or process operations, and prefer non-interactive commands where possible.
