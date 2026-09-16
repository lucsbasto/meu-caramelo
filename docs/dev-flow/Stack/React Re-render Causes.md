---
title: React Re-render Causes
aliases: [react performance, why component re-renders, usememo usecallback, inline props rerender, react optimization, react gotchas]
summary: Why React component re-renders. Inline obj props, stale closures, context refs. useMemo only when measured.
tags: [dev-flow/stack]
created: 2026-04-29
template: ai-note
status: seed
---

# React Re-render Causes

New ref every render = child re-renders. Measure before memo.

## Symptom Map

| Symptom | Cause | Fix |
|---------|-------|-----|
| Memoed child still re-renders | inline `{}`/`[]`/arrow prop | hoist or `useMemo`/`useCallback` |
| Whole tree updates on context change | new context value object | memoize value, split contexts |
| Stale state in handler | closure captured old state | add dep, use ref, or functional setter |
| `useEffect` loops | object/array in deps | memoize dep or compare by id |
| Slow list interaction | unmemoed row + new fn props | memo row + stable callbacks |

## Inline ref trap

```tsx
// new {} each render → memoed Child re-renders
<Child style={{ color: "red" }} />

// stable
const style = useMemo(() => ({ color: "red" }), []);
<Child style={style} />
```

## Stale closure

```tsx
useEffect(() => {
  const id = setInterval(() => setN(n + 1), 1000); // n frozen
  return () => clearInterval(id);
}, []); // missing n; use setN(prev => prev + 1)
```

Rule: reach for `useMemo`/`useCallback` only after profiler confirms cost.

## Related
[[Verification Gates]] · [[Systematic Debugging]]
