# Project Rules

Binding rules for anyone working in this repository, human or AI agent.

## 1. Code language

All code must be written in English: identifiers (variables, functions, classes, files), comments, and log/error messages. User-facing text (i18n strings) may stay in the product language (Portuguese).

## 2. Best practices — Dev Flow

Follow the best-practices knowledge base at [`docs/dev-flow/`](docs/dev-flow/).

Before any non-trivial task, consult it:
1. Substring-search [`docs/dev-flow/dev-flow-lookup.md`](docs/dev-flow/dev-flow-lookup.md) — a question → note FAQ index.
2. Read the linked note and apply its rules.

Coverage includes:
- **Clean code:** SOLID, DRY, YAGNI, naming, function size, error handling.
- **Debugging:** root-cause over patch; no hook bypass, no `--no-verify`.
- **Git:** atomic commits, branch hygiene, PR template.
- **Verification gates:** must pass before claiming work complete.
- **Stack notes:** TypeScript, React, Next.js, Postgres, Prisma.

## 3. Agent autonomy

Never ask the user to do something achievable via available tools or CLI. Attempt to fetch or execute it yourself first before delegating to the user. (Example: EAS build logs are reachable via `eas build:view <id> --json` — the `logFiles` field carries a public signed URL.)
