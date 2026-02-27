# AGENTS.md

## Purpose
This file defines mandatory rules for any agent working in this repository.
Priorities: correctness > simplicity > maintainability > performance.

## Architecture Rules
- Preserve separation of concerns (UI, domain logic, services).
- Avoid coupling screens/components directly to API access.
- Centralize external integrations (HTTP, storage, auth) in reusable services.
- Prefer composition over inheritance and small/cohesive functions.
- Do not introduce new dependencies without a clear cost/benefit justification.

## Code Rules
- Use strict TypeScript and explicit typing in public contracts.
- Name variables/functions with clear intent; avoid ambiguous abbreviations.
- Handle errors explicitly; do not silently swallow exceptions.
- Avoid duplication: extract utilities when repetition is real.
- Make minimal, localized changes; do not refactor beyond what the task requires.
- Keep compatibility with the existing project patterns.

## Quality Rules
- Always validate build/typecheck/lint when applicable before finishing.
- When fixing bugs, describe root cause and regression prevention.
- Do not break existing behavior unless explicitly required.
- Update short documentation when technical decisions change behavior.

## Token Economy (Mandatory)
- Be objective and direct; avoid long explanations when unnecessary.
- Read only the files needed for the task.
- Reuse already collected context; avoid redundant inspections.
- Avoid generating long code/output when a shorter solution is enough.
- In responses, prioritize actionable summaries and short next steps.

## Decision Process
- If rules conflict, follow this order:
  1. Functional correctness
  2. Security
  3. Simplicity
  4. Token economy
  5. Delivery speed
