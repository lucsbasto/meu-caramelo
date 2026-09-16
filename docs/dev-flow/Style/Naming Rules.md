---
title: Naming Rules
aliases: [variable naming, function naming, class naming, intention revealing names, how to name function, when to rename variable, hungarian notation, searchable names]
summary: Names reveal intent. Nouns for classes, verbs for functions. No types, no encodings, no mental mapping.
tags: [dev-flow/clean-code]
created: 2026-04-29
template: ai-note
status: seed
---

# Naming Rules

Name reveals intent. If name needs comment, name failed.

## Rule

- Reveal intent — name answers why/what/how. `daysSinceCreate` not `d`
- No disinformation — `accountList` only if actual `List`. Else `accounts`
- Distinct meaningfully — drop noise: `Data`, `Info`, `Object`, `Manager`
- Pronounceable — `genTimestamp` not `genymdhms`
- Searchable — single-letter only inside ≤2-line loops. Else full word
- No encodings — no Hungarian (`strName`), no `m_` prefix, no `I` for interface
- No mental map — `r` forces reader to translate. Just write `url`
- One word per concept — pick `fetch` OR `get` OR `retrieve`. Don't mix
- Avoid `l`, `O` as single chars — confuse w/ `1`, `0`

## Format

| Construct | Part of speech | Example |
|---|---|---|
| Class | Noun | `Customer`, `Invoice` |
| Method/function | Verb / verb-phrase | `postPayment`, `deletePage` |
| Boolean / predicate | `is` / `has` / `can` | `isEmpty`, `hasChildren` |
| Accessor | `get` / `set` | `getName`, `setName` |
| Variable | Noun, scope-sized | `userCount`, `i` (tiny loop only) |

## Scope length

- Variables — bigger scope = longer name. Module-level `currentUserSession`, loop-local `i`
- Functions — bigger scope = shorter name. Public `open()`, private `openFileOrThrowIfMissing()`

## Smell

- Need comment to explain name → rename
- Two names for same concept → unify
- Suffix-only diff (`User` vs `UserData`) → merge or rename one

## Related

[[YAGNI Rules]] · [[Comment Discipline]] · [[Refactor Safety]]
