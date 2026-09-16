---
title: Postgres Index Choices
aliases: [postgres index types, btree gin partial covering, when to index, postgres performance, query optimization, postgres index selection]
summary: Postgres index selection by query shape. btree, gin, partial, covering, expression. Index not free.
tags: [dev-flow/stack]
created: 2026-04-29
status: seed
---

# Postgres Index Choices

Match index to query shape. Index not free — slows writes, costs disk.

## Picker

| Query shape | Index |
|-------------|-------|
| `=`, `<`, `>`, `BETWEEN`, `ORDER BY` | btree (default) |
| `jsonb @>`, full-text `@@`, array `&&` | gin |
| Hot subset (`WHERE active=true`) | partial btree |
| Index-only scan needed | covering (`INCLUDE`) |
| `WHERE lower(email)=...` | expression |
| Geo / range overlap | gist |

## Examples

```sql
-- partial: only index live rows
CREATE INDEX ON orders (user_id) WHERE status = 'open';

-- covering: avoid heap fetch
CREATE INDEX ON orders (user_id) INCLUDE (total, status);

-- gin on jsonb
CREATE INDEX ON events USING gin (payload jsonb_path_ops);

-- expression
CREATE INDEX ON users (lower(email));
```

## Cost

Each index = extra write per insert/update/delete + disk + planner time. Drop unused (`pg_stat_user_indexes.idx_scan = 0`). `EXPLAIN ANALYZE` before adding.

## Related
[[Prisma Footguns]] · [[Verification Gates]] · [[Systematic Debugging]]
