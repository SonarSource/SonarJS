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

  ruleTester.run('aria-labelledby takes precedence over aria-label and text', rule, {
    valid: [
      {
        // Same aria-labelledby id, but different aria-label and text: still the same accessible
        // name, because aria-labelledby outranks both.
        code: `
          <div>
            <a href="/a" aria-labelledby="x" aria-label="A">One</a>
            <a href="/a" aria-labelledby="x" aria-label="B">Two</a>
          </div>;
        `,
      },
    ],
    invalid: [
      {
        code: `
          <div>
            <a href="/a" aria-labelledby="x" aria-label="A">One</a>
            <a href="/b" aria-labelledby="x" aria-label="B">Two</a>
          </div>;
        `,
        errors: 1,
      },
      {
        // A resolvable but empty aria-labelledby falls through to aria-label, same as aria-label
        // falling through to text when it resolves to an empty string.
        code: `
          <div>
            <a href="/a" aria-labelledby="" aria-label="Same">One</a>
            <a href="/b" aria-label="Same">Two</a>
          </div>;
        `,
        errors: 1,
      },
    ],
  });

  ruleTester.run('unresolvable aria-labelledby excludes the anchor', rule, {
    valid: [
      {
        code: `
          <div>
            <a href="/a" aria-labelledby={dynamicId}>Same</a>
            <a href="/b">Same</a>
          </div>;
        `,
      },
      {
        // A spread that could set aria-labelledby is also treated as conservatively unresolvable.
        code: `
          <div>
            <a {...linkProps} href="/a">Same</a>
            <a href="/b" aria-labelledby="x">Same</a>
          </div>;
        `,
      },
    ],
    invalid: [],
  });

  ruleTester.run('a hidden ancestor excludes the anchor', rule, {
    valid: [
      {
        // An ancestor's aria-hidden hides the anchor, even though the anchor's own attributes and
        // its sibling's are unremarkable.
        code: `
          <section aria-hidden="true">
            <div>
              <a href="/a">Same</a>
              <a href="/b">Same</a>
            </div>
          </section>;
        `,
      },
      {
        // An ancestor's boolean hidden attribute hides the anchor.
        code: `
          <div hidden>
            <a href="/a">Same</a>
            <a href="/b">Same</a>
          </div>;
        `,
      },
      {
        // An ancestor's display:none hides the anchor.
        code: `
          <div style={{ display: 'none' }}>
            <a href="/a">Same</a>
            <a href="/b">Same</a>
          </div>;
        `,
      },
    ],
    invalid: [
      {
        // An unresolvable ancestor hidden-state is conservatively treated as NOT hidden.
        code: `
          <div aria-hidden={dynamicHidden}>
            <a href="/a">Same</a>
            <a href="/b">Same</a>
          </div>;
        `,
        errors: 1,
      },
    ],
  });

  ruleTester.run("a nested element's own aria-labelledby is treated as unresolvable", rule, {
    valid: [
      {
        // A nested aria-labelledby (e.g. a labelled icon) makes the anchor's name unresolvable,
        // even though the visible text matches - excluded rather than compared via that text.
        code: `
          <div>
            <a href="/a"><span aria-labelledby="l1">Save</span></a>
            <a href="/b"><span aria-labelledby="l2">Save</span></a>
          </div>;
        `,
      },
    ],
    invalid: [],
  });

  ruleTester.run("a nested element's own aria-label overrides its content", rule, {
    valid: [
      {
        // Distinct own-labels on an otherwise-empty nested icon give each link a different name.
        code: `
          <div>
            <a href="/a"><svg aria-label="Download" /></a>
            <a href="/b"><svg aria-label="Share" /></a>
          </div>;
        `,
      },
    ],
    invalid: [
      {
        code: `
          <div>
            <a href="/a"><svg aria-label="Download" /></a>
            <a href="/b"><svg aria-label="Download" /></a>
          </div>;
        `,
        errors: 1,
      },
    ],
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
