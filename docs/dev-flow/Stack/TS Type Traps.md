---
title: TS Type Traps
aliases: [typescript type narrowing, satisfies vs as, never type, ts pitfalls, type guards, typescript gotchas]
summary: TypeScript type pitfalls. Narrowing, satisfies vs as, never for exhaustive, as any last resort.
tags: [dev-flow/stack]
created: 2026-04-29
template: ai-note
status: seed
---

# TS Type Traps

Narrowing breaks silent. `as` lies. `never` enforces.

## Traps

| Trap | Fix |
|------|-----|
| `as` cast hides mismatch | `satisfies` for shape check + literal infer |
| `in` narrows wrong on optional | user-defined type guard `x is T` |
| Missing case in switch | exhaustive `never` default |
| `as any` to silence | last resort, comment why, isolate |
| Object spread widens | `satisfies` after spread |

## satisfies vs as

```ts
const cfg = { mode: "fast" } satisfies Config; // checks shape, keeps literal
const bad = { mode: "fast" } as Config;        // trusts you, no check
```

## Exhaustive never

```ts
function handle(x: A | B) {
  if (x.k === "a") return;
  if (x.k === "b") return;
  const _: never = x; // compile error if new variant added
}
```

## Type guard

```ts
function isErr(x: unknown): x is { code: string } {
  return typeof x === "object" && x !== null && "code" in x;
}
```

## Related
[[Verification Gates]] · [[Systematic Debugging]] · [[Root-Cause vs Patch]]
