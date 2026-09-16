---
title: Bug Postmortem Template
aliases: [postmortem template, incident report, blameless retro, root cause analysis, rca, post-incident review]
summary: Postmortem skeleton. Summary, Impact, Timeline, Root Cause (5-whys), Resolution, Prevention.
tags: [dev-flow/retros]
created: 2026-04-29
status: seed
---

# Bug Postmortem Template

Blameless postmortem skeleton. Filename `YYYY-MM-DD-slug.md`. Focus systems, not people.

| Section | Goal |
|---------|------|
| Summary | One line — what broke |
| Impact | Who, how many, duration |
| Timeline | UTC events, detection to fix |
| Root Cause | 5-whys to underlying cause |
| Resolution | What stopped bleeding |
| Prevention | Owned action items |

```markdown
---
title: YYYY-MM-DD <slug>
tags: [dev-flow/retros]
created: YYYY-MM-DD
status: seed
---

# YYYY-MM-DD: <Incident Title>

## Summary
One sentence. What broke, scope.

## Impact
- Users affected: <n / segment>
- Duration: <start UTC> -> <end UTC>
- Severity: SEV-<n>

## Timeline (UTC)
- HH:MM — signal observed
- HH:MM — paged
- HH:MM — mitigation deployed
- HH:MM — resolved

## Root Cause (5-whys)
1. Why? ...
2. Why? ...
3. Why? ...
4. Why? ...
5. Why? <root>

## Resolution
What action stopped impact. Patch link, revert SHA.

## Prevention
- [ ] action — owner — due
- [ ] action — owner — due
```

## Related
[[Systematic Debugging]] · [[Root-Cause vs Patch]] · [[Verification Gates]]
