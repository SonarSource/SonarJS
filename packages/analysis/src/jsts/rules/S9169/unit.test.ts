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
import path from 'node:path';
import { describe, it } from 'node:test';
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';

const MESSAGE =
  'Move this call to module scope or replace it with vi.doMock(); vi.mock is hoisted and cannot provide runtime or per-test mocking.';

describe('S9169', () => {
  it('does not flag an unbound "vi" name when the project has no Vitest signal', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('vi.mock should be declared at module scope', rule, {
      valid: [
        {
          // No Vitest import and no Vitest dependency anywhere: an unrelated global
          // named `vi` must not be assumed to be Vitest's, otherwise this produces a
          // false positive on any file that happens to declare its own `vi`/`vitest`
          // global with an unrelated `.mock()` method.
          code: `
function helper() {
  vi.mock('x');
}
`,
        },
      ],
      invalid: [],
    });
  });

  it('flags an unbound "vi" name when the project depends on Vitest without importing it', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('vi.mock should be declared at module scope', rule, {
      valid: [],
      invalid: [
        {
          // Regression test for a project whose package.json depends on Vitest but
          // the file itself does not import it (e.g. `vi` is injected as a global
          // through Vitest's `globals: true` config): the dependency-manifest signal
          // must still be enough to recognize `vi` as Vitest's.
          filename: path.join(
            import.meta.dirname,
            'fixtures',
            'vitest-dependency',
            'nested.spec.js',
          ),
          code: `
function helper() {
  vi.mock('x'); // Noncompliant
}
`,
          errors: [{ message: MESSAGE }],
        },
      ],
    });
  });

  it('flags "vi.mock" when "vi" is registered as an environment global', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('vi.mock should be declared at module scope', rule, {
      valid: [],
      invalid: [
        {
          // Regression test for `sonar.javascript.environments=vitest`: the `globals`
          // package registers `vi`/`vitest` as read-only globals, which makes
          // getFullyQualifiedName return the bare, non-import-resolved name
          // ("vi.mock") instead of null. That must still fall through to the global
          // Vitest namespace check instead of being treated as "not Vitest".
          filename: path.join(
            import.meta.dirname,
            'fixtures',
            'vitest-dependency',
            'nested.spec.js',
          ),
          languageOptions: {
            globals: { vi: 'readonly' },
          },
          code: `
function helper() {
  vi.mock('x'); // Noncompliant
}
`,
          errors: [{ message: MESSAGE }],
        },
      ],
    });
  });
});
