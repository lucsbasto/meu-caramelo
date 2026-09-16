---
title: Next.js Cache Layers
aliases: [nextjs caching, next cache, fetch cache, route cache, revalidate, ppr use cache, next 15 cache]
summary: Next.js 4 cache layers — Memoization, Data, Full Route, Router. fetch options, revalidate, tag invalidation.
tags: [dev-flow/stack]
created: 2026-04-29
template: ai-note
status: seed
---

# Next.js Cache Layers

Four layers stack. Each invalidates different. Know which one bites.

## Layers

| Layer | Scope | Lifetime | Invalidate |
|-------|-------|----------|------------|
| Request Memoization | per request, React | single render | automatic |
| Data Cache | server, cross-request | persistent | `revalidate`, `revalidateTag`, `revalidatePath` |
| Full Route Cache | server, static routes | until rebuild/revalidate | `revalidatePath`, dynamic API use |
| Router Cache | client, in-memory | session/30s-5min | `router.refresh()`, nav, `revalidatePath` |

## fetch defaults

```ts
fetch(url);                            // cached (Data Cache)
fetch(url, { cache: "no-store" });     // dynamic, skips cache
fetch(url, { next: { revalidate: 60 } });
fetch(url, { next: { tags: ["posts"] } });
```

## Targeted invalidation

```ts
"use server";
import { revalidateTag, revalidatePath } from "next/cache";
export async function publish() {
  revalidateTag("posts");
  revalidatePath("/blog");
}
```

## Next 15+ PPR + use cache

```ts
"use cache";
export async function getPosts() { /* ... */ }
```

PPR splits route into static shell + dynamic holes. `use cache` opts function into Data Cache with `cacheLife`/`cacheTag`.

## Related
[[Verification Gates]] · [[Systematic Debugging]]
