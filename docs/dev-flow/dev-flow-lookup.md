---
title: Dev Flow Lookup
aliases: [Dev Flow Lookup, dev flow faq, dev workflow questions, lookup index, question index, faq, where do I find]
summary: Question → note FAQ index for AI agent retrieval. Search question verbatim, jump via wikilink.
tags: [dev-flow/moc]
created: 2026-04-29
status: index
---

# Dev Flow Lookup

Question → note. Substring-search this file for fastest match. Wikilinks resolve to canonical note.

## Workflow

| Question | Note |
|----------|------|
| What to do before non-trivial task? | [[Pre-Task Checklist]] |
| When is work done? | [[Verification Gates]] |
| What gates must pass before merge? | [[Verification Gates]] |
| When can I claim a feature complete? | [[Verification Gates]] |
| What does an agent loop look like? | [[Agent Loop Anatomy]] |
| How many iterations before agent stops? | [[Agent Loop Anatomy]] |
| When should agent terminate or escalate? | [[Agent Loop Anatomy]] |
| How to retro a session? | [[Session Retro]] |
| What to save to long-term memory? | [[Session Retro]] |

## Debug

| Question | Note |
|----------|------|
| How to debug systematically? | [[Systematic Debugging]] |
| How to start when I have a bug? | [[Systematic Debugging]] |
| Should I patch or root-cause? | [[Root-Cause vs Patch]] |
| Can I use --no-verify? | [[Root-Cause vs Patch]] |
| Can I bypass a hook? | [[Root-Cause vs Patch]] |
| How to write a postmortem? | [[Bug Postmortem Template]] |

## Tooling

| Question | Note |
|----------|------|
| What is rtk? | [[RTK Cheatsheet]] |
| Which rtk command for tests? | [[RTK Cheatsheet]] |
| Which agent should I delegate to? | [[Agent Routing]] |
| Which model — opus, sonnet, haiku? | [[Agent Routing]] |
| Should I work directly or spawn agent? | [[Agent Routing]] |
| What does 'autopilot' / 'ralph' / 'ulw' do? | [[Skill Triggers]] |
| How to cancel an OMC mode? | [[Skill Triggers]] |

## Clean Code

| Question | Note |
|----------|------|
| Should I add a comment? | [[Comment Discipline]] |
| When to write JSDoc / docstring? | [[Comment Discipline]] |
| Should I build this abstraction now? | [[YAGNI Rules]] |
| Should I add error handling here? | [[YAGNI Rules]] |
| Should I add a feature flag? | [[YAGNI Rules]] |
| How to name a function or variable? | [[Naming Rules]] |
| When to rename a variable? | [[Naming Rules]] |
| Should I use Hungarian notation or type prefixes? | [[Naming Rules]] |
| When to split a class? | [[Single Responsibility]] |
| Is this an SRP violation? | [[Single Responsibility]] |
| Two teams editing same module — what now? | [[Single Responsibility]] |
| Is this function too long? | [[Function Size]] |
| When to split a function? | [[Function Size]] |
| How many arguments are too many? | [[Function Size]] |
| Am I duplicating knowledge or just shape? | [[DRY]] |
| When to extract a shared function? | [[DRY]] |
| Difference between DRY and YAGNI? | [[DRY]] |
| Should I throw or return an error? | [[Error Handling]] |
| Where should I catch exceptions? | [[Error Handling]] |
| Should I add try/catch around impossible state? | [[Error Handling]] |
| When to extract an interface? | [[Open Closed Principle]] |
| Should I add a strategy pattern here? | [[Open Closed Principle]] |
| Switch chain keeps growing — what to do? | [[Open Closed Principle]] |
| Is this subclass safe to substitute? | [[Liskov Substitution]] |
| Why does Square/Rectangle break inheritance? | [[Liskov Substitution]] |
| Is `instanceof` check a smell? | [[Liskov Substitution]] |
| Is this interface too fat? | [[Interface Segregation]] |
| When to split an interface? | [[Interface Segregation]] |
| What is a god interface? | [[Interface Segregation]] |
| Should I inject this dep or `new` it? | [[Dependency Inversion]] |
| Depend on interface or concrete class? | [[Dependency Inversion]] |
| DIP vs DI — same thing? | [[Dependency Inversion]] |
| Should this function be pure? | [[Pure Functions]] |
| Is it OK to mutate this argument? | [[Pure Functions]] |
| When can I break purity? | [[Pure Functions]] |
| Is `a.getB().getC()` chain bad? | [[Law of Demeter]] |
| What does "tell don't ask" mean? | [[Law of Demeter]] |
| When are chained calls OK? | [[Law of Demeter]] |

## Note Writing

| Question | Note |
|----------|------|
| How to structure an Obsidian note? | [[Note Anatomy]] |
| What goes in note frontmatter? | [[Note Anatomy]] |
| How to make notes AI-retrievable? | [[Note AI Tuning]] |
| What aliases / summary to use? | [[Note AI Tuning]] |

## Git

| Question | Note |
|----------|------|
| How to format a commit? | [[Atomic Commit]] |
| Should I split this commit? | [[Atomic Commit]] |
| What goes in a PR description? | [[PR Template]] |
| How to name a branch? | [[Branch Hygiene]] |
| Rebase or merge? | [[Branch Hygiene]] |
| Can I force-push? | [[Branch Hygiene]] |
| How to work on multiple tasks in parallel? | [[Parallel Worktree Sessions]] |
| Should I use a worktree per task? | [[Parallel Worktree Sessions]] |
| How to run parallel sessions? | [[Parallel Worktree Sessions]] |
| Can I commit from the primary repo? | [[Parallel Worktree Sessions]] |

## Stack

| Question | Note |
|----------|------|
| TypeScript type narrowing fails — why? | [[TS Type Traps]] |
| satisfies vs as? | [[TS Type Traps]] |
| Why does my React component re-render? | [[React Re-render Causes]] |
| When useMemo / useCallback? | [[React Re-render Causes]] |
| How does Next.js cache work? | [[Next.js Cache Layers]] |
| When to revalidate / revalidateTag? | [[Next.js Cache Layers]] |
| Which Postgres index for this query? | [[Postgres Index Choices]] |
| btree vs gin vs partial? | [[Postgres Index Choices]] |
| Why is my Prisma query N+1? | [[Prisma Footguns]] |
| Prisma transaction modes? | [[Prisma Footguns]] |
| $queryRaw safe? | [[Prisma Footguns]] |

## Decisions / Retros

| Question | Note |
|----------|------|
| How to write an ADR? | [[ADR Template]] |
| How to record a design decision? | [[ADR Template]] |
| Refactor — what to check? | [[Refactor Safety]] |
| How to refactor without breaking? | [[Refactor Safety]] |

## How to use

- Substring search this file w/ user's literal question
- Multiple matches → pick first (most specific)
- Resolve wikilink to read full rule
- Update this index when adding new note

## Related

[[Dev Flow MOC]]
