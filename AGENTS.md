# AGENTS.md

Conventions for agents and humans working in this repo.

## Worktree rule — one worktree per branch/PR

Every unit of work (feature, fix, chore that becomes a PR) is done in its own
git worktree under the internal `.worktrees/` folder. This keeps `main` clean,
avoids stashing, and lets several PRs be worked on side by side.

### Layout

```
meu-caramelo/            # main checkout, stays on `main`
  .worktrees/            # git-ignored, all task worktrees live here
    feat-auth-login/     # one folder per branch
    fix-seed-crash/
```

- `.worktrees/` is git-ignored (see `.gitignore`). Never commit it.
- Folder name mirrors the branch name with `/` replaced by `-`.

### Package manager — pnpm

This repo uses **pnpm** (pinned in `package.json` → `packageManager`). pnpm keeps
one global content-addressable store and links each `node_modules` from it, so a
worktree's `node_modules` costs almost no extra disk — this is what makes many
worktrees cheap. Never use `npm`/`yarn` here (they would create a competing
lockfile and defeat the shared store).

- `.npmrc` sets `node-linker=hoisted` so React Native / Metro see a flat
  `node_modules` (Metro does not follow pnpm's default symlinked layout).
- pnpm is provided via corepack; if `pnpm` is missing run `corepack pnpm -v`
  once, or install a shim: `corepack enable --install-directory $(npm config get prefix) pnpm`.

### Branch naming

Use Conventional-Commit-style prefixes: `feat/`, `fix/`, `chore/`, `docs/`,
`refactor/`, `test/`. Example: `feat/auth-login`.

### Create a worktree for new work

```powershell
# from the main checkout, branch off up-to-date main
git fetch origin
git worktree add .worktrees/feat-auth-login -b feat/auth-login origin/main
cd .worktrees/feat-auth-login

# install deps — hardlinked from the global store, so it is fast and tiny
pnpm install
```

Each worktree gets its own isolated `node_modules`, but the files are hardlinks
into the shared pnpm store — no duplication on disk. Deps may differ freely
between branches without one leaking into another.

### Finish and open the PR

```bash
git push -u origin feat/auth-login
# open PR (e.g. gh pr create), review, merge on the remote
```

### Remove the worktree after the PR merges

```bash
cd ../..                                   # back to main checkout
git worktree remove .worktrees/feat-auth-login
git branch -d feat/auth-login              # delete local branch
git fetch --prune                          # drop stale remote refs
```

### Disk footprint

Worktrees stay light because pnpm hardlinks every dependency from the global
store (`pnpm store path` shows it). A fresh `pnpm install` in a new worktree
adds near-zero real bytes for packages already in the store. Changing deps on a
branch just relinks — no full re-download, no leak into other worktrees. After
the PR merges, `git worktree remove` drops that worktree's `node_modules` with it.

### Rules

- One branch = one worktree = one PR. Do not stack unrelated work on a branch.
- Always `pnpm install` in a new worktree; never `npm install`.
- Keep `main` checkout only for `main`; do not create feature branches there.
- List active worktrees with `git worktree list`.
- If a worktree is abandoned, remove it (`git worktree remove --force <path>`)
  so it does not rot in `.worktrees/`.
