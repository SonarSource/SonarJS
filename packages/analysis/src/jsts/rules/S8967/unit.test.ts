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
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './index.js';

const MESSAGE = 'Remove this interpolation from the inline snapshot.';

describe('S8967', () => {
  it('S8967', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    const jestFixture = path.join(import.meta.dirname, 'fixtures', 'jest', 'snapshot.test.ts');

    ruleTester.run('Inline snapshots should not contain interpolations', rule, {
      valid: [
        {
          code: `
            import { expect, it } from '@jest/globals';

            it('keeps a static inline snapshot', () => {
              expect(getUser()).toMatchInlineSnapshot(\`
                {
                  "id": 1,
                  "name": "Alice",
                }
              \`);
            });
          `,
        },
        {
          code: `
            import { expect, it } from '@jest/globals';

            it('keeps property matchers with a static snapshot', () => {
              expect(getUser()).toMatchInlineSnapshot(
                { id: expect.any(Number) },
                \`
                  {
                    "id": Any<Number>,
                    "name": "Alice",
                  }
                \`,
              );
            });
          `,
        },
        {
          code: [
            "import { expect, it } from '@jest/globals';",
            '',
            "it('ignores escaped placeholders', () => {",
            '  expect(renderTemplate()).toMatchInlineSnapshot(`Hello \\${name}`);',
            '});',
          ].join('\n'),
        },
        {
          code: `
            import { expect, it } from '@jest/globals';

            it('ignores custom wrappers', () => {
              expect(getUser()).custom.toMatchInlineSnapshot(\`
                {
                  "id": \${getUser().id},
                }
              \`);
            });
          `,
        },
        {
          code: `
            const expect = require('chai').expect;

            it('ignores non jest or vitest expect chains', () => {
              expect(getUser()).toMatchInlineSnapshot(\`
                {
                  "id": \${getUser().id},
                }
              \`);
            });
          `,
        },
      ],
      invalid: [
        {
          code: `
            import { expect, it } from '@jest/globals';

            it('reports jest inline snapshot interpolation', () => {
              const user = getUser();

              expect(user).toMatchInlineSnapshot(\`
                {
                  "id": \${user.id},
                  "name": "Alice",
                }
              \`);
            });
          `,
          errors: [{ message: MESSAGE }],
        },
        {
          code: `
            import { expect, it } from '@jest/globals';

            it('reports snapshot argument after property matchers', () => {
              const user = getUser();

              expect(user).toMatchInlineSnapshot(
                { id: expect.any(Number) },
                \`
                  {
                    "id": \${user.id},
                    "name": "Alice",
                  }
                \`,
              );
            });
          `,
          errors: [{ message: MESSAGE }],
        },
        {
          code: `
            import { expect, it } from '@jest/globals';

            it('reports thrown error inline snapshot interpolation', () => {
              const file = 'config.yaml';

              expect(() => parseFile(file)).toThrowErrorMatchingInlineSnapshot(
                \`"Invalid file: \${file}"\`,
              );
            });
          `,
          errors: [{ message: MESSAGE }],
        },
        {
          code: `
            import * as vitest from 'vitest';

            vitest.test('reports namespaced vitest expect', () => {
              const user = getUser();

              vitest.expect(user).toMatchInlineSnapshot(\`
                {
                  "id": \${user.id},
                }
              \`);
            });
          `,
          errors: [{ message: MESSAGE }],
        },
        {
          code: `
            import { expect, it } from '@jest/globals';

            it('reports resolves modifier chains', async () => {
              const user = getUser();

              await expect(Promise.resolve(user)).resolves.toMatchInlineSnapshot(\`
                {
                  "id": \${user.id},
                }
              \`);
            });
          `,
          errors: [{ message: MESSAGE }],
        },
        {
          code: `
            import { expect, it } from '@jest/globals';

            it('reports rejects modifier chains', async () => {
              const file = 'config.yaml';

              await expect(Promise.reject(new Error(file))).rejects.toThrowErrorMatchingInlineSnapshot(
                \`"Invalid file: \${file}"\`,
              );
            });
          `,
          errors: [{ message: MESSAGE }],
        },
        {
          code: `
            it('reports global jest expect when dependency metadata enables the framework', () => {
              const user = getUser();

              expect(user).toMatchInlineSnapshot(\`
                {
                  "id": \${user.id},
                }
              \`);
            });
          `,
          filename: jestFixture,
          errors: [{ message: MESSAGE }],
        },
      ],
    });
  });
});
