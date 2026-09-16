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
import { rule } from './rule.js';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe } from 'node:test';

describe('S1101', () => {
  const ruleTester = new NoTypeCheckingRuleTester();

  ruleTester.run('hidden-link resolution', rule, {
    valid: [
      {
        // aria-hidden as a boolean JSX expression, not just a string, excludes the anchor.
        code: `
          <div>
            <a href="/a" aria-hidden={true}>Same</a>
            <a href="/b">Same</a>
          </div>;
        `,
      },
      {
        // A resolvable object-form style with a differently-cased "none" value still hides.
        code: `
          <div>
            <a href="/a" style={{ display: 'NONE' }}>Same</a>
            <a href="/b">Same</a>
          </div>;
        `,
      },
    ],
    invalid: [
      {
        // aria-hidden={false} does not hide the anchor: it is compared, and conflicts.
        code: `
          <div>
            <a href="/a" aria-hidden={false}>Same</a>
            <a href="/b">Same</a>
          </div>;
        `,
        errors: 1,
      },
      {
        // hidden={false} does not hide the anchor.
        code: `
          <div>
            <a href="/a" hidden={false}>Same</a>
            <a href="/b">Same</a>
          </div>;
        `,
        errors: 1,
      },
      {
        // An unresolvable dynamic `hidden` value is conservatively treated as NOT hidden.
        code: `
          <div>
            <a href="/a" hidden={dynamicHidden}>Same</a>
            <a href="/b">Same</a>
          </div>;
        `,
        errors: 1,
      },
      {
        // An unresolvable dynamic style value is conservatively treated as NOT hidden.
        code: `
          <div>
            <a href="/a" style={dynamicStyle}>Same</a>
            <a href="/b">Same</a>
          </div>;
        `,
        errors: 1,
      },
    ],
  });

  ruleTester.run('parent-scoped comparison', rule, {
    valid: [
      {
        // Different parents: never compared, regardless of identical text.
        code: `
          <div>
            <div><a href="/a">Same</a></div>
            <div><a href="/b">Same</a></div>
          </div>;
        `,
      },
      {
        // A non-rendering function is a real scope boundary, separate from the file-level scope.
        code: `
          const helper = () => <a href="/a">Same</a>;
          const b = <a href="/b">Same</a>;
        `,
      },
      {
        // A switch statement's cases are mutually exclusive conditional branches.
        code: `
          function StatusLink({ status }) {
            switch (status) {
              case 'a':
                return <a href="/status/a">Status</a>;
              default:
                return <a href="/status/b">Status</a>;
            }
          }
        `,
      },
    ],
    invalid: [
      {
        // A .map()/.flatMap() callback does not introduce a scope boundary.
        code: `
          <div>
            {items.map(() => <a href="/inside-map">Same</a>)}
            <a href="/outside-map">Same</a>
          </div>;
        `,
        errors: 1,
      },
    ],
  });

  ruleTester.run('conditional siblings compared beyond the immediate predecessor', rule, {
    valid: [],
    invalid: [
      {
        // The "/b" branch must be compared against the unrelated `isAdmin` guard further down, not just its exclusive "/a" sibling.
        code: `
          <div>
            {cond ? <a href="/a">Same</a> : <a href="/b">Same</a>}
            {isAdmin && <a href="/a">Same</a>}
          </div>;
        `,
        errors: [{ messageId: 'identicalTextDifferentTarget', line: 4 }],
      },
    ],
  });

  ruleTester.run('unresolvable aria-label excludes the anchor', rule, {
    valid: [
      {
        // An unresolvable aria-label excludes the anchor even though the visible text matches.
        code: `
          <div>
            <a href="/a" aria-label={dynamicLabel}>Same</a>
            <a href="/b">Same</a>
          </div>;
        `,
      },
      {
        // Idiomatic per-item aria-label: the recommended fix for this rule must not itself be flagged.
        code: `
          <div>
            <a href="/posts/1" aria-label={\`Read more about \${a.title}\`}>Read more</a>
            <a href="/posts/2" aria-label={\`Read more about \${b.title}\`}>Read more</a>
          </div>;
        `,
      },
    ],
    invalid: [],
  });

  ruleTester.run('chained conditionals are exclusive across the whole chain', rule, {
    valid: [
      {
        // A chained ternary (`a ? X : (b ? Y : Z)`) makes all three branches pairwise exclusive.
        code: `
          <div>
            {a ? <a href="/1">D</a> : b ? <a href="/2">D</a> : <a href="/3">D</a>}
          </div>;
        `,
      },
      {
        // Each early return excludes every later statement, not just the immediately preceding guard.
        code: `
          function F(a, b) {
            if (a) return <a href="/1">D</a>;
            if (b) return <a href="/2">D</a>;
            return <a href="/3">D</a>;
          }
        `,
      },
    ],
    invalid: [],
  });
});
