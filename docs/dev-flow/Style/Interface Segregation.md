---
title: Interface Segregation
aliases: [ISP, interface segregation principle, fat interface, god interface, role interface, is this interface too fat, when to split interface, client-specific interface]
summary: Many small client-specific interfaces beat one fat interface. Split when clients depend on methods they don't use.
tags: [dev-flow/clean-code]
created: 2026-04-29
template: ai-note
status: seed
---

# Interface Segregation

Clients shouldn't depend on methods they don't call. Split fat interfaces by client role, not by class.

## Rule

- One interface per client role, not per class
- Smell: client implements methods as `throw NotImplemented` or empty stub
- Smell: change to method `X` forces recompile/redeploy of client that never calls `X`
- Split by capability (`Printer`, `Scanner`), not by category (`Device`)
- Compose roles via intersection types / multi-implement when client truly needs both
- Wrap third-party god interface w/ Adapter exposing only role you need

## Fat vs Split

| Aspect | Fat interface | Split (role) interfaces |
|---|---|---|
| Shape | `IDevice { print, scan, fax, email }` | `IPrinter`, `IScanner`, `IFax`, `IEmailer` |
| Client w/ 1 capability | Implements 4 methods, 3 stubs | Implements 1 interface |
| Method signature change | Recompiles all clients | Recompiles only clients of that role |
| Test mocks | Mock entire surface | Mock the one role |
| Discoverability | "What does this thing do?" unclear | Name = capability |
| Empty/throw stubs | Common | Absent |

## When to Split

- Client implements method as no-op, stub, or throws "not supported"
- Two unrelated clients share interface but use disjoint method sets
- Method added for client A breaks/forces churn on client B
- Interface name is generic (`IService`, `IManager`, `IHandler`) — likely god

## When Not to Split

- All methods used by every client — interface is cohesive
- One implementation, one caller — see [[YAGNI Rules]], don't pre-split
- Splitting fragments a genuine atomic role (e.g. `Iterator { hasNext, next }`)

## Related

[[Single Responsibility]] · [[YAGNI Rules]] · [[Function Size]]
