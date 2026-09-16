---
title: Prisma Footguns
aliases: [prisma orm pitfalls, prisma n+1, prisma transaction, prisma migration, prisma raw query, prisma gotchas]
summary: Prisma ORM footguns. N+1 from missing include/select, $transaction modes, migration order, $queryRaw injection.
tags: [dev-flow/stack]
created: 2026-04-29
template: ai-note
status: seed
---

# Prisma Footguns

ORM hides SQL. Hides perf cliffs too.

## Footguns

| Footgun | Guardrail |
|---------|-----------|
| N+1 from lazy relation access | `include` / `select` upfront |
| Unbounded `findMany` | always `take` + cursor pagination |
| Interactive `$transaction(fn)` holds connection | prefer sequential `$transaction([...])` |
| Migration order drift in CI | `migrate deploy` only, never `db push` in prod |
| `$queryRawUnsafe` w/ interpolation | `$queryRaw\`...${val}\`` or `Prisma.sql` |
| `select: { ...all }` over-fetch | pick exact fields used |
| Missing index on FK filter | add `@@index` in schema |

## Safe raw

```ts
// SAFE: parameterized
await prisma.$queryRaw`SELECT * FROM u WHERE id = ${id}`;

// UNSAFE: string concat
await prisma.$queryRawUnsafe(`SELECT * FROM u WHERE id = ${id}`);
```

## Sequential vs interactive tx

```ts
// sequential — fast, no app logic between
await prisma.$transaction([a, b, c]);

// interactive — only when you need conditional logic
await prisma.$transaction(async (tx) => {
  const x = await tx.a.create(...);
  if (x.flag) await tx.b.update(...);
});
```

## Related
[[Postgres Index Choices]] · [[Verification Gates]] · [[Systematic Debugging]]
