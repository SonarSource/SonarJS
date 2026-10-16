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

import { Linter, Rule } from 'eslint';
import type estree from 'estree';
import parser from '@typescript-eslint/parser';
import {
  getProperty,
  getUniqueWriteUsageOrNode,
  resolveSingleWriteExpression,
} from '../../../../src/jsts/rules/helpers/ast.js';

import { describe, test } from 'node:test';
import { expect } from 'expect';
import { parseJavaScriptSourceFile } from '../../tools/helpers/parsing.js';

describe('getProperty', () => {
  const cases = [
    [
      'should read property of simple object',
      'normalObject.js',
      'foo',
      property => expect(property.value.type).toEqual('Literal'),
    ],
    [
      'should return null if key not found in simple object',
      'normalObject.js',
      'baz',
      property => expect(property).toBeNull(),
    ],
    [
      'should read property of object with a recursive spread operator',
      'objectWithSpread.js',
      'bar',
      property => expect(property.value.type).toEqual('Literal'),
    ],
    [
      'should read undefined of object with a recursive spread operator if key not found',
      'objectWithSpread.js',
      'baz',
      property => expect(property).toBeUndefined(),
    ],
    [
      'should return undefined for objects whose spread operators reference each other',
      'objectWithMutualSpread.js',
      'baz',
      property => expect(property).toBeUndefined(),
    ],
  ] as const;
  for (const [_, fixtureFile, key, verifier] of cases) {
    test(`it ${_}`, async () => {
      const baseDir = path.join(import.meta.dirname, 'fixtures');

      const linter = new Linter();

      const filePath = path.join(baseDir, fixtureFile);
      const { sourceCode } = await parseJavaScriptSourceFile(filePath);

      linter.verify(
        sourceCode,
        {
          plugins: {
            sonarjs: {
              rules: {
                'custom-rule-file': {
                  create(context: Rule.RuleContext) {
                    return {
                      'ExpressionStatement ObjectExpression': node => {
                        const property = getProperty(node, key, context);
                        verifier(property);
                      },
                    };
                  },
                } as Rule.RuleModule,
              },
            },
          },
          rules: { 'sonarjs/custom-rule-file': 'error' },
        },
        { filename: filePath, allowInlineConfig: false },
      );
    });
  }
});

describe('getUniqueWriteUsageOrNode', () => {
  test('resolves identifier chains recursively', () => {
    const resolved = resolveCallArgument(`
      const secret = 'value';
      const alias = secret;
      consume(alias);
    `);

    expect(resolved).toMatchObject({ type: 'Literal', value: 'value' });
  });

  test('terminates on a self-referencing variable', () => {
    const resolved = resolveCallArgument(`
      let secret = secret;
      consume(secret);
    `);

    expect(resolved?.type).toBe('Identifier');
  });

  test('terminates on mutually-referencing variables', () => {
    const resolved = resolveCallArgument(`
      let first = second;
      let second = first;
      consume(first);
    `);

    expect(resolved?.type).toBe('Identifier');
  });
});

for (const [name, languageOptions] of [
  ['JavaScript', { ecmaVersion: 2022 }],
  ['TypeScript', { ecmaVersion: 2022, parser }],
] as const) {
  describe(`resolveSingleWriteExpression with ${name}`, () => {
    for (const [subject, code, expected] of [
      ['literal', "consume('value');", { type: 'Literal', value: 'value' }],
      [
        'alias chain',
        "const value = 'value'; const alias = value; consume(alias);",
        { type: 'Literal', value: 'value' },
      ],
      [
        'single assignment',
        "let value; value = 'value'; consume(value);",
        { type: 'Literal', value: 'value' },
      ],
      ['unresolved name', 'consume(value);', { type: 'Identifier', name: 'value' }],
      [
        'multiple writes',
        "let value = 'first'; value = 'second'; consume(value);",
        { type: 'Identifier', name: 'value' },
      ],
      [
        'parameter default',
        "function f(value = 'default') { consume(value); }",
        { type: 'Identifier', name: 'value' },
      ],
      [
        'destructured binding',
        "const { value } = { value: 'value' }; consume(value);",
        { type: 'Identifier', name: 'value' },
      ],
      [
        'destructured default',
        "const [value = 'default'] = []; consume(value);",
        { type: 'Identifier', name: 'value' },
      ],
      [
        'rest binding',
        "const { children, ...value } = { children: 'value' }; consume(value);",
        { type: 'Identifier', name: 'value' },
      ],
      [
        'self-reference',
        'let value = value; consume(value);',
        { type: 'Identifier', name: 'value' },
      ],
      [
        'mutual references',
        'let first = second; let second = first; consume(first);',
        { type: 'Identifier' },
      ],
    ] as const) {
      test(`resolves ${subject} without assuming an unknown value`, () => {
        expect(
          resolveCallArgument(code, resolveSingleWriteExpression, languageOptions),
        ).toMatchObject(expected);
      });
    }
  });
}

test('resolveSingleWriteExpression unwraps nested TypeScript assertions throughout aliases', () => {
  const resolved = resolveCallArgument(
    `const value = ('value' as string)!;
     const alias = value satisfies string;
     consume((alias as string)!);`,
    resolveSingleWriteExpression,
    { parser },
  );
  expect(resolved).toMatchObject({ type: 'Literal', value: 'value' });
});

function resolveCallArgument(
  code: string,
  resolve: (context: Rule.RuleContext, node: estree.Node) => estree.Node = (context, node) =>
    getUniqueWriteUsageOrNode(context, node, true),
  languageOptions: Linter.LanguageOptions = { ecmaVersion: 2022 },
): estree.Node | undefined {
  let resolved: estree.Node | undefined;
  const linter = new Linter();
  const messages = linter.verify(
    code,
    {
      languageOptions,
      plugins: {
        sonarjs: {
          rules: {
            'resolve-call-argument': {
              create(context: Rule.RuleContext) {
                return {
                  CallExpression(node: estree.CallExpression) {
                    const argument = node.arguments[0];
                    if (argument?.type !== 'SpreadElement') {
                      resolved = resolve(context, argument);
                    }
                  },
                };
              },
            } as Rule.RuleModule,
          },
        },
      },
      rules: { 'sonarjs/resolve-call-argument': 'error' },
    },
    { allowInlineConfig: false },
  );
  expect(messages).toHaveLength(0);
  return resolved;
}
