---
title: ADR Template
aliases: [architecture decision record, adr, decision log, design decision, technical decision, decision template]
summary: Architecture Decision Record skeleton. Status, Context, Decision, Consequences, Alternatives.
tags: [dev-flow/decisions]
created: 2026-04-29
status: seed
---

# ADR Template

Skeleton for one architecture decision. Filename `ADR-NNNN-slug.md`.

One ADR = one decision. Supersede instead of edit. Link superseded ADR both ways.

| Field | Purpose |
|-------|---------|
| Status | proposed / accepted / superseded |
| Context | Forces in play, constraints |
| Decision | Chosen path, active voice |
| Consequences | Trade made — both sides |
| Alternatives | Rejected options + why |

```markdown
---
title: ADR-NNNN <slug>
tags: [dev-flow/decisions]
created: YYYY-MM-DD
status: proposed
---

# ADR-NNNN: <Decision Title>

## Status
proposed | accepted | superseded by [[ADR-MMMM-slug]]

## Context
What forces are in play? Constraints, requirements, prior pain.

## Decision
We will <do X> because <reason>.

## Consequences
**Positive**
- gain 1
- gain 2

**Negative**
- cost 1
- cost 2

## Alternatives Considered
- **Option B** — rejected because <reason>
- **Option C** — rejected because <reason>
```

## Related
[[Verification Gates]] · [[Pre-Task Checklist]] · [[Root-Cause vs Patch]]
