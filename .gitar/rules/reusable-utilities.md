---
title: Reuse existing utilities
description: Prefer existing SonarJS utilities when reuse preserves behavior.
type: check
when: PRs that add or change SonarJS implementation code
actions: Report duplicated utility logic and suggest a concrete behavior-preserving replacement.
---

# Reuse existing utilities

Before recommending a new helper or accepting duplicated logic, check for an existing utility
with the same contract. For JavaScript and TypeScript rules, inspect
`packages/analysis/src/jsts/rules/helpers/`. For shared infrastructure, inspect
`packages/shared/src/helpers/` and the affected module's existing helpers.

For example, use the existing `childrenOf(node, visitorKeys)` helper from
`packages/analysis/src/jsts/rules/helpers/ancestor.ts` when its direct-child traversal matches
the intended behavior. Do not replace traversal with generic enumeration of AST object keys.

Report a reuse opportunity only when you can name the existing utility, its path, and the
replacement call or import. Explain why the replacement preserves the relevant behavior,
including parser-service requirements, supported syntax, traversal order, error handling,
issue locations, and quick fixes. Do not suggest reuse based only on similar names.

Keep intentionally different behavior when the existing helper does not match. Do not introduce
a cross-layer dependency, broaden a helper's contract, or request unrelated refactoring merely
to remove a small duplication. If equivalence is uncertain, state what evidence is needed
instead of presenting the replacement as safe.
