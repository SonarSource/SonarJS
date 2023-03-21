/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { Linter, SourceCode } from 'eslint';
import { eslintRules } from 'linting/eslint/rules/core';
import { rules as typescriptESLintRules } from '@typescript-eslint/eslint-plugin';
import { rules as reactESLintRules } from 'eslint-plugin-react';
import path from 'path';
import { parseJavaScriptSourceFile, parseTypeScriptSourceFile } from '../../../../tools';
import { decorateExternalRules } from 'linting/eslint/linter/decoration';

const externalRules = { ...eslintRules, ...typescriptESLintRules, ...reactESLintRules };
const decoratedExternalRules = decorateExternalRules(externalRules);

describe('decorateExternalRules', () => {
  test.each(['comma-dangle', 'enforce-trailing-comma'])(
    'should make `enforce-trailing-comma` an alias for `comma-dangle`',
    async ruleId => {
      const linter = new Linter();
      linter.defineRules(decoratedExternalRules);

      const filePath = path.join(__dirname, 'fixtures', 'decorate', 'enforce-trailing-comma.js');
      const sourceCode = (await parseJavaScriptSourceFile(filePath)) as SourceCode;

      const rules = { [ruleId]: 'error' } as any;

      const [message] = linter.verify(sourceCode, { rules });
      expect(message).toEqual(
        expect.objectContaining({
          ruleId,
        }),
      );
    },
  );

  it('should replace TypeScript ESLint `no-throw-literal` with ESLint implementation', async () => {
    const linter = new Linter();
    linter.defineRules(decoratedExternalRules);

    const filePath = path.join(__dirname, 'fixtures', 'decorate', 'no-throw-literal.js');
    const sourceCode = (await parseJavaScriptSourceFile(filePath)) as SourceCode;

    const ruleId = 'no-throw-literal';
    const rules = { [ruleId]: 'error' } as any;

    const [message] = linter.verify(sourceCode, { rules });
    expect(message).toEqual(
      expect.objectContaining({
        ruleId,
      }),
    );
  });

  it('should sanitize TypeScript ESLint rules', async () => {
    const linter = new Linter();
    linter.defineRules(decoratedExternalRules);

    const filePath = path.join(__dirname, 'fixtures', 'decorate', 'sanitization.ts');
    const tsConfigs = [];

    const sourceCode = (await parseTypeScriptSourceFile(
      filePath,
      tsConfigs,
      'MAIN',
      true,
    )) as SourceCode;
    expect(sourceCode.parserServices.hasFullTypeInformation).toBeDefined();
    expect(sourceCode.parserServices.hasFullTypeInformation).toEqual(false);

    const ruleId = 'prefer-readonly';
    const rules = { [ruleId]: 'error' } as any;

    const messages = linter.verify(sourceCode, { rules });
    expect(messages).toHaveLength(0);
  });

  test.each([{ decorate: true }, { decorate: false }])(
    'should apply internal decorators',
    async ({ decorate }) => {
      const linter = new Linter();
      linter.defineRules(decorate ? decoratedExternalRules : externalRules);

      const filePath = path.join(__dirname, 'fixtures', 'decorate', 'internal-decorator.js');
      const sourceCode = (await parseJavaScriptSourceFile(filePath)) as SourceCode;

      const ruleId = 'accessor-pairs';
      const rules = { [ruleId]: 'error' } as any;

      const messages = linter.verify(sourceCode, { rules });
      if (decorate) {
        expect(messages).toHaveLength(0);
      } else {
        expect(messages).toHaveLength(1);
        expect(messages[0]).toEqual(
          expect.objectContaining({
            ruleId,
          }),
        );
      }
    },
  );
});
