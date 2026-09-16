---
title: Note AI Tuning
aliases: [ai retrieval, agent retrieval, note search optimization, aliases summary, retrieval tuning, ai-friendly notes, note search]
summary: Make Obsidian notes findable by AI agents. Aliases, summary FM field, stable H2, lookup index.
tags: [dev-flow/style]
created: 2026-04-29
template: ai-note
status: seed
---

# Note AI Tuning

Make atomic notes findable via MCP `obsidian_search_notes` + `obsidian_get_note`.

## Levers

| Lever | Effect |
|-------|--------|
| `aliases` FM array | Substring search hits synonyms + question forms |
| `summary` FM scalar | 1-call FM read = pre-filter w/o body load |
| Stable first H2 | Section-targeted reads (`Rule`, `Phases`, etc) |
| Question keywords in body | Match "when to X", "how to Y" search |
| `_Lookup.md` FAQ entry | Direct question → wikilink map |

## Aliases pattern

Include: synonyms, abbreviations, tool/term variants, question-form ("when to comment", "why does X re-render").

## Summary pattern

1 line. Keyword-rich. Question-answer form. Unquoted YAML scalar (escape if special chars).

Example: `summary: When to write code comments. Default no. WHY only, never WHAT.`

## Validation

| Test | Tool call |
|------|-----------|
| Substring recall | `search_notes mode=text query=<question>` |
| Alias match | `search_notes mode=jsonlogic logic={"in": [...]}` |
| Section read | `get_note format=section type=heading target=<H2>` |
| FM-only read | `get_note format=section type=frontmatter target=summary` |

## Maintain

New note → add FAQ entry to [[Dev Flow Lookup]]. Promote `seed` → `growing` after first AI agent retrieval works.

## Related

[[Note Anatomy]] · [[Dev Flow Lookup]]
