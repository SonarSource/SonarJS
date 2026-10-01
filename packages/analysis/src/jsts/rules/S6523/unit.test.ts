/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import {
  DefaultParserRuleTester,
  NoTypeCheckingRuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { getESLintCoreRule } from '../external/core.js';
import { describe, it } from 'node:test';

// Sentinel: verify that the upstream ESLint rule still raises on the patterns our decorator suppresses.
// If this test starts failing (i.e., the upstream rule no longer reports these patterns),
// it signals that the decorator can be safely removed.
describe('S6523 upstream sentinel', () => {
  it('upstream no-unsafe-optional-chaining raises on patterns our decorator suppresses', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    const upstreamRule = getESLintCoreRule('no-unsafe-optional-chaining');

    ruleTester.run('upstream no-unsafe-optional-chaining raises on fixed patterns', upstreamRule, {
      valid: [],
      invalid: [
        // the ticket's own reproducer
        {
          code: `
function filterComments(ast: { leadingComments?: Array<{ value: string }> }) {
  return [...(ast.leadingComments ?? [])?.filter(c => !c.value.includes('@managed'))];
}
          `,
          errors: 1,
        },
        // Array.prototype method returning an Array
        { code: `[...(a ?? [])?.map(g)];`, errors: 1 },
        // Array.prototype method returning a String
        { code: `[...(a ?? [])?.join(",")];`, errors: 1 },
        // `||` fallback, not just `??`
        { code: `[...(a || [])?.filter(f)];`, errors: 1 },
        // TypeScript `as` wrapper around the fallback
        { code: `[...((a ?? []) as Foo)?.filter(f)];`, errors: 1 },
        // `!` wrapping the whole guarded receiver
        { code: `[...(a ?? [])!?.filter(f)];`, errors: 1 },
        // bare array-literal receiver, no `??` needed
        { code: `[...[]?.filter(f)];`, errors: 1 },
        // `WithStatement` context, not a spread
        { code: `with ((a ?? [])?.filter(f)) {}`, errors: 1 },
        // unsafeArithmetic message under the non-default option
        {
          code: `const q = (a ?? [])?.join(",") + "!";`,
          options: [{ disallowArithmeticOperators: true }],
          errors: 1,
        },
      ],
    });
  });
});

describe('S6523', () => {
  it('S6523', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run(
      'Optional chaining should not be used if returning "undefined" throws an error',
      rule,
      {
        valid: [
          {
            // AC1: the ticket's own reproducer, verbatim
            code: `
function filterComments(ast: { leadingComments?: Array<{ value: string }> }) {
  return [...(ast.leadingComments ?? [])?.filter(c => !c.value.includes('@managed'))];
}
            `,
          },
          // `map` -> new Array
          { code: `[...(a ?? [])?.map(g)];` },
          // `join` -> String, a different return kind than the Array methods
          { code: `[...(a ?? [])?.join(",")];` },
          { code: `[...(a ?? [])?.toSorted(g)];` },
          { code: `[...(a ?? [])?.toReversed()];` },
          { code: `[...(a ?? [])?.toSpliced(0, 1)];` },
          { code: `[...(a ?? [])?.with(0, 1)];` },
          // `||` fallback yields its left operand only when truthy
          { code: `[...(a || [])?.filter(f)];` },
          // left-nested `??` peel
          { code: `[...(a ?? b ?? [])?.filter(f)];` },
          // mixed `||`-into-`??` peel
          { code: `[...(a || (b ?? []))?.filter(f)];` },
          // TypeScript `as` wrapper on the fallback
          { code: `[...((a ?? []) as Foo)?.filter(f)];` },
          // `!` wrapping the whole guarded receiver (proof comes from the `??`, not the `!`)
          { code: `[...(a ?? [])!?.filter(f)];` },
          // non-empty array literal fallback
          { code: `[...(a ?? [1, 2])?.filter(f)];` },
          // bare array-literal receiver, no `??` needed
          { code: `[...[]?.filter(f)];` },
          // `ForOfStatement` context
          { code: `for (const v of (a ?? [])?.filter(f)) {}` },
          // `VariableDeclarator` destructuring context
          { code: `const [p] = (a ?? [])?.filter(f);` },
          // `in` operand context
          { code: `"0" in ((a ?? [])?.filter(f));` },
          // `WithStatement` context (non-spread)
          { code: `with ((a ?? [])?.filter(f)) {}` },
          // chain nested in call arguments
          { code: `h([...(a ?? [])?.filter(f)]);` },
          // the proof never looks at the receiver's type: `any` receiver
          { code: `function w(p: any) { return [...(p ?? [])?.filter(f)]; }` },
          // unsafeArithmetic message: a String result, never NaN
          {
            code: `const q = (a ?? [])?.join(",") + "!";`,
            options: [{ disallowArithmeticOperators: true }],
          },
          // type arguments hang off the CallExpression, not the callee
          { code: `[...(a ?? [])?.filter<any>(f)];` },
          // arguments are never inspected
          { code: `[...(a ?? [])?.filter(...[f])];` },
          // debated row (plan §5/§0 decision 3): suppressed though it throws - the throw comes from
          // the argument chain, not the reported chain's value; upstream is silent on the
          // non-optional equivalent `[...[].filter(g?.h)]`
          { code: `[...(a ?? [])?.filter(g?.h)];` },
          // no-op: object spread is excluded upstream, reported neither before nor after
          { code: `({ ...(a ?? [])?.c });` },
          // no-op: `delete` is not a guarded context
          { code: `delete a?.b.c;` },
          // no-op: arithmetic is not guarded without the option
          { code: `const q = (a ?? [])?.length + 1;` },
          // pins the outer TS-wrapper strip at decorator.ts's first `unwrapTypeScriptExpression`
          // call: without it, this shape (ChainExpression > TSNonNullExpression > CallExpression)
          // would fall through to `return false` and regress to a report
          { code: `[...(a ?? [])?.filter(f)!];` },
          // pins the `estree.Super` arm of `isArrayFallback`'s receiver type: `super.x ?? []` is
          // non-nullish, so `.filter` on it is safe, the same as any other non-nullish receiver
          {
            code: `class C extends B { m() { return [...(super.x ?? [])?.filter(f)]; } }`,
          },
        ],
        invalid: [
          // Every row below reports identically before and after the change (measured 1 -> 1):
          // they are over-reach guards proving the exemption stays narrow, not RED coverage.
          // Only the `valid` rows above fail against the pre-change (external, undecorated) rule.
          // -- Return value not proven --
          // TP-undef: `forEach` always returns undefined
          { code: `[...(a ?? [])?.forEach(f)];`, errors: 1 },
          // TP-undef: `pop` may return undefined
          { code: `[...(a ?? [])?.pop()];`, errors: 1 },
          // TP-undef: `find` may return undefined
          { code: `[...(a ?? [])?.find(f)];`, errors: 1 },
          // TP-undef: `reduce` may return undefined
          { code: `[...(a ?? [])?.reduce(g, undefined)];`, errors: 1 },
          // -- Shape not matched --
          // FP-left: an uncalled member read; excluded so that reading past it below still reports
          { code: `[...(a ?? [])?.filter];`, errors: 1 },
          // TP-undef: the cheapest counter-example - a real undefined read past the proven call
          { code: `[...(a ?? [])?.filter.zzz];`, errors: 1 },
          // TP-undef: unknown member, `[].c` is undefined
          { code: `[...(a ?? [])?.c];`, errors: 1 },
          // FP-left: `length` is a non-`Array.prototype`-method uncalled member
          { code: `[...(a ?? [])?.length];`, errors: 1 },
          // FP-left (acceptance #3): a second, unguarded optional link further along the chain
          { code: `[...(a ?? [])?.filter(f)?.map(g)];`, errors: 1 },
          // FP-left: a non-optional method chain after the proven link
          { code: `[...(a ?? [])?.filter(f).map(g)];`, errors: 1 },
          // FP-left (acceptance #3): an optional call is a second optional link
          { code: `[...(a ?? [])?.filter?.(f)];`, errors: 1 },
          // FP-left: value is never undefined but the call itself is broken
          { code: `[...(a ?? [])?.()];`, errors: 1 },
          // TP-undef: computed key, unknown at parse time
          { code: `[...(a ?? [])?.[k]];`, errors: 1 },
          // TP-undef: `TSInstantiationExpression` callee is not stripped, fails closed
          { code: `[...(a ?? [])?.foo<string>?.()];`, errors: 1 },
          // FP-left: computed string property not resolved
          { code: `[...(a ?? [])?.["filter"](f)];`, errors: 1 },
          // TP-undef (acceptance #5): nested chain receiver can itself short-circuit
          { code: `[...(a?.b)?.filter(f)];`, errors: 1 },
          // FP-left (acceptance #3): nested proven chain used as the receiver of a further access
          { code: `[...((a ?? [])?.filter(f))?.map(g)];`, errors: 1 },
          // TP-undef: `!` mid-spine strips to an unguarded `a?.b`
          { code: `[...a?.b!.filter(f)];`, errors: 1 },
          // -- Fallback not proven --
          // TP-undef (acceptance #1): plain optional chain, no fallback
          { code: `[...ast.leadingComments?.filter(f)];`, errors: 1 },
          // TP-undef (acceptance #2): fallback is a call, value unknown
          { code: `[...(a ?? getDefault())?.filter(f)];`, errors: 1 },
          // TP-undef (acceptance #4): fallback is an identifier, value unknown
          { code: `[...(a ?? b)?.filter(f)];`, errors: 1 },
          // TP-undef: the fallback is itself nullish
          { code: `[...(a ?? null)?.filter(f)];`, errors: 1 },
          { code: `[...(a ?? undefined)?.filter(f)];`, errors: 1 },
          { code: `[...(a ?? void 0)?.filter(f)];`, errors: 1 },
          // TP-undef: `&&` yields its possibly-nullish left operand, not a proven fallback
          { code: `[...(a && [])?.filter(f)];`, errors: 1 },
          // TP-undef: `!` used as the proof itself is an unverified assertion
          { code: `[...(a ?? b!)?.filter(f)];`, errors: 1 },
          // TP-undef: the ternary's other branch has no `filter`
          { code: `[...(x ? [] : {})?.filter(f)];`, errors: 1 },
          // TP-undef: object-literal fallback has no `filter`
          { code: `[...(a ?? {})?.c];`, errors: 1 },
          // FP-left: `new Array()` needs name resolution to prove `Array` is the global
          { code: `[...(a ?? new Array())?.filter(f)];`, errors: 1 },
          // TP-undef: a JSX element has no `filter`
          { code: `[...(a ?? <div/>)?.filter(f)];`, errors: 1 },
          // TP-undef: the peel's right operand is itself a chain that can be undefined
          { code: `[...(a ?? (b?.c))?.filter(f)];`, errors: 1 },
          // TP-undef: a nested nullish fallback - the peel's second iteration terminates on a
          // nullish literal, so the fallback is still not proven
          { code: `[...(a ?? (b ?? null))?.filter(f)];`, errors: 1 },
          // TP-undef: `||` yields its possibly-nullish left operand when falsy but not nullish;
          // here the right operand is itself nullish, so the fallback is not proven
          { code: `[...(a || undefined)?.filter(f)];`, errors: 1 },
          // FP-left (acceptance #7): aliasing through a variable is not resolved - no guessing
          {
            code: `function w(p) { const r = p ?? []; return [...r?.filter(f)]; }`,
            errors: 1,
          },
          // -- Context negatives --
          { code: `class Y extends (a ?? Base)?.b {}`, errors: 1 },
          { code: `const n = new ((a ?? Base)?.b)();`, errors: 1 },
          { code: `with ((a ?? {})?.b) {}`, errors: 1 },
          { code: `function w({ p } = (a ?? {})?.y) {}`, errors: 1 },
          // -- Arithmetic option --
          {
            code: `const q = a?.b + 1;`,
            options: [{ disallowArithmeticOperators: true }],
            errors: 1,
          },
          {
            code: `const q = (a ?? [])?.length + 1;`,
            options: [{ disallowArithmeticOperators: true }],
            errors: 1,
          },
        ],
      },
    );
  });

  it('S6523 granularity', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('per-report granularity', rule, {
      valid: [],
      invalid: [
        {
          // one chain suppressed, a second unguarded chain on the next line still reported
          code: `[...(a ?? [])?.filter(f)];\n[...a?.d];`,
          errors: [{ messageId: 'unsafeOptionalChain', line: 2 }],
        },
        {
          // both chains in one expression: only the unguarded one is reported
          code: `[...(a ?? [])?.filter(f), ...a?.d];`,
          errors: [{ messageId: 'unsafeOptionalChain', column: 30 }],
        },
      ],
    });
  });

  it('S6523 plain JavaScript', () => {
    // Proves the fix is syntactic and needs no type information at all.
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run('works with no type information', rule, {
      valid: [
        // works in plain .js with no type information
        { code: `function w2(p) { return [...(p ?? [])?.filter(f)]; }` },
      ],
      invalid: [
        // TP-undef (acceptance #1): plain optional chain, no fallback, in plain JS
        { code: `[...ast.leadingComments?.filter(f)];`, errors: 1 },
        // TP-undef: nullish fallback, in plain JS
        { code: `[...(a ?? null)?.filter(f)];`, errors: 1 },
      ],
    });
  });
});
