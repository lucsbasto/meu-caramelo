---
title: Dev Flow MOC
aliases: [Dev Flow MOC, dev workflow index, dev flow map, dev moc, dev flow domain, workflow index]
summary: Dev Flow domain MOC. Loops, debug, tooling, style, git, stack, decisions, retros. Dataview-driven index.
tags: [dev-flow/moc]
created: 2026-04-29
status: index
---

# Dev Flow

Discipline: ship clean, ship fast. Loops, debug habits, tool routing.

## Loops

```dataview
LIST
FROM #dev-flow/loop
SORT file.name ASC
```

## Debug

```dataview
LIST
FROM #dev-flow/debug
SORT file.name ASC
```

## Tooling

```dataview
LIST
FROM #dev-flow/tooling
SORT file.name ASC
```

## Style

```dataview
LIST
FROM #dev-flow/style
SORT file.name ASC
```

## Clean Code

```dataview
LIST
FROM #dev-flow/clean-code
SORT file.name ASC
```

## Git

```dataview
LIST
FROM #dev-flow/git
SORT file.name ASC
```

## Stack

```dataview
LIST
FROM #dev-flow/stack
SORT file.name ASC
```

## Decisions

```dataview
LIST
FROM #dev-flow/decisions
SORT file.name ASC
```

## Retros

```dataview
LIST
FROM #dev-flow/retros
SORT file.name ASC
```

## Status board

```dataview
TABLE status, file.mtime as updated
FROM #dev-flow
WHERE status != "index"
SORT status ASC, file.name ASC
```

## Conventions

- Atomic: one concept per note
- Tag: `#dev-flow/{loop|debug|tooling|style|clean-code|git|stack|decisions|retros|moc}`
- Status: seed → growing → stable
- Caveman prose. Tables over paragraphs.

## Related

[[Dev Flow Lookup]]
