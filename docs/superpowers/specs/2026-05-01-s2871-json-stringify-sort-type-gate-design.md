# S2871 JSON.stringify sort-comparison type gate

## Context

The current S2871 false-positive remediation suppresses issues for comparisons shaped like:

- `JSON.stringify(a.sort()) === JSON.stringify(b.sort())`
- `JSON.stringify(a.toSorted()) === JSON.stringify(b.toSorted())`

That is too broad. It currently accepts array-like receivers without checking whether default sort semantics are meaningful for the element types. In particular, generic object-array cases should not be treated as safe normalization by default.

## Goal

Keep the existing narrow comparison shape, but only suppress when the bare sort is used as a symmetric normalization step on known-safe data shapes.

## Non-goals

- Do not suppress direct array reference comparisons such as `a.sort() === b.sort()`.
- Do not broaden the exception to assertion helpers, `.join()`, `.toString()`, or other comparison wrappers.
- Do not suppress mixed `sort()` / `toSorted()` comparisons.

## Design

The rule should continue recognizing only strict or loose equality/inequality comparisons where both operands are `JSON.stringify(...)` calls and the argument of each `JSON.stringify(...)` is a bare `sort()` or `toSorted()` call.

Before suppressing, add a semantic gate:

1. Both sides must use the same method family:
   - `sort()` on both sides, or
   - `toSorted()` on both sides.
2. Both sorted receivers must satisfy one of these cases:
   - both receivers are `Object.entries(...)` calls, or
   - both receivers are arrays whose element type is known to be one of:
     - `number`
     - `boolean`
     - `string`
     - `symbol`
     - `bigint`

If either side falls outside those cases, keep raising S2871.

## Expected behavior changes

Still suppressed:

- `JSON.stringify(a.sort()) === JSON.stringify(b.sort())` where `a` and `b` are `string[]`
- `JSON.stringify(a.toSorted()) !== JSON.stringify(b.toSorted())` where `a` and `b` are `number[]`
- `JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort())`

No longer suppressed:

- `JSON.stringify(a.sort()) === JSON.stringify(b.toSorted())`
- `JSON.stringify(a.sort()) === JSON.stringify(b.sort())` where `a` and `b` are `Foo[]`
- `JSON.stringify(a.sort()) === JSON.stringify(b.sort())` where element type is `any`, `unknown`, or not known

## Implementation notes

- Keep the top-level suppression shape in `packages/analysis/src/jsts/rules/S2871/rule.ts`.
- Add helpers that inspect the sorted receiver expression and its TypeScript element type.
- Reuse existing type helpers where possible and add a primitive-element helper for the allowlist above.
- Update unit tests first to cover:
  - same-family primitive arrays suppressed
  - same-family `Object.entries(...)` suppressed
  - mixed-family comparisons reported
  - object arrays reported
  - unknown/`any` arrays reported

## Risks

- Type-based checks can become overly permissive if `any` or broad unions are treated as allowed. They should not be.
- `Object.entries(...)` remains a syntactic special case and should stay exact rather than generalized to arbitrary array-producing calls.
