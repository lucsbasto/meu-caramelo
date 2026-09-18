#!/usr/bin/env node
// Create an isolated worktree + branch for a parallel task session.
// Usage: node scripts/new-task.mjs <type> <slug>
//   e.g. node scripts/new-task.mjs feat oauth-pkce
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const USER = "lucas";
const VALID_TYPES = ["feat", "fix", "refactor", "chore", "docs", "test", "perf"];

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: "utf8", stdio: "pipe", ...opts });
}

const [type, slug] = process.argv.slice(2);

if (!type || !slug) {
  fail("usage: node scripts/new-task.mjs <type> <slug>");
}
if (!VALID_TYPES.includes(type)) {
  fail(`type must be one of: ${VALID_TYPES.join("|")}`);
}
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
  fail("slug must be kebab-case (a-z0-9 and hyphens)");
}
if (slug.length > 40) {
  fail("slug must be <= 40 chars");
}

const branch = `${USER}/${type}/${slug}`;
const repoRoot = run("git", ["rev-parse", "--show-toplevel"]).trim();
const repoName = path.basename(repoRoot);
const parent = path.dirname(repoRoot);
const wtPath = path.join(parent, `${repoName}-${slug}`);

if (existsSync(wtPath)) {
  fail(`worktree already exists: ${wtPath}`);
}

// pnpm is a .cmd shim on Windows; shell:true resolves it via PATHEXT.
const isWin = process.platform === "win32";

run("git", ["worktree", "add", wtPath, "-b", branch], { stdio: "inherit" });
run("pnpm", ["install"], { cwd: wtPath, stdio: "inherit", shell: isWin });

console.log("");
console.log(`worktree ready: ${wtPath}  (branch ${branch})`);
console.log("open a NEW session there:");
console.log(`  cd "${wtPath}" && claude`);
