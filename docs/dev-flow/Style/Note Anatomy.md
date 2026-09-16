---
title: Note Anatomy
aliases: [note structure, note shape, frontmatter shape, body shape, note skeleton, how to structure a note, note format]
summary: Obsidian note frontmatter + body skeleton. Atomic, ≤40 line body, banned patterns list.
tags: [dev-flow/style]
created: 2026-04-29
template: ai-note
status: seed
---

# Note Anatomy

Skeleton for atomic Obsidian notes — frontmatter + body shape.

## Frontmatter

```yaml
---
title: <H1 match>
aliases: [synonyms, question-forms]
summary: <1-line retrieval hook>
tags: [<domain>/<sub>]
created: YYYY-MM-DD
template: ai-note
status: seed | growing | stable | index
---
```

Banned keys: `parent`, `children`, `related`. Use wikilinks + backlinks.

## Body shape

| Part | Form |
|------|------|
| H1 | matches `title` exactly |
| Orientation | one line under H1, no blockquote, no TL;DR |
| First H2 | stable vocab: Rule, Phases, Loop, Decision, Cmds, When |
| Length | ≤40 line body |
| Related | trailing H2, ≤3 wikilinks, `[[X]] · [[Y]] · [[Z]]` |

## Banned

- Blockquote intros / "Foundational..." prose
- Body `## TL;DR`, "Why this exists", "Open questions"
- Manual sibling lists — use backlinks/Dataview
- Multi-concept bundle — split into N atomic notes

## Related

[[Note AI Tuning]] · [[Dev Flow Lookup]]
