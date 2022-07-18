/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

import { Linter, Rule, SourceCode } from 'eslint';
import { rules as typescriptESLintRules } from '@typescript-eslint/eslint-plugin';
import path from 'path';
import { parseJavaScriptSourceFile, parseTypeScriptSourceFile } from '../../../../testing/helpers';
import { decorateExternalRules } from 'linting/eslint/linter/decoration';

describe('decorateExternalRules', () => {
  test.each(['comma-dangle', 'enforce-trailing-comma'])(
    'should make `enforce-trailing-comma` an alias for `comma-dangle`',
    ruleId => {
      const externalRules = getExternalRules();
      decorateExternalRules(externalRules);

      const linter = new Linter();
      linter.defineRules(externalRules);

      const filePath = path.join(__dirname, 'fixtures', 'decorate', 'enforce-trailing-comma.js');
      const sourceCode = parseJavaScriptSourceFile(filePath) as SourceCode;

      const rules = { [ruleId]: 'error' } as any;

      const [message] = linter.verify(sourceCode, { rules });
      expect(message).toEqual(
        expect.objectContaining({
          ruleId,
        }),
      );
    },
  );

  it('should replace TypeScript ESLint `no-throw-literal` with ESLint implementation', () => {
    const externalRules = getExternalRules();
    decorateExternalRules(externalRules);

    const linter = new Linter();
    linter.defineRules(externalRules);

    const filePath = path.join(__dirname, 'fixtures', 'decorate', 'no-throw-literal.js');
    const sourceCode = parseJavaScriptSourceFile(filePath) as SourceCode;

    const ruleId = 'no-throw-literal';
    const rules = { [ruleId]: 'error' } as any;

    const [message] = linter.verify(sourceCode, { rules });
    expect(message).toEqual(
      expect.objectContaining({
        ruleId,
      }),
    );
  });

  it('should sanitize TypeScript ESLint rules', () => {
    const externalRules = getExternalRules();
    decorateExternalRules(externalRules);

    const linter = new Linter();
    linter.defineRules(externalRules);

    const filePath = path.join(__dirname, 'fixtures', 'decorate', 'sanitization.ts');
    const tsConfigs = [];

    const sourceCode = parseTypeScriptSourceFile(filePath, tsConfigs) as SourceCode;
    expect(sourceCode.parserServices.hasFullTypeInformation).toBeDefined();
    expect(sourceCode.parserServices.hasFullTypeInformation).toEqual(false);

    const ruleId = 'prefer-readonly';
    const rules = { [ruleId]: 'error' } as any;

    const messages = linter.verify(sourceCode, { rules });
    expect(messages).toHaveLength(0);
  });

  test.each([{ decorate: true }, { decorate: false }])(
    'should apply internal decorators',
    ({ decorate }) => {
      const externalRules = getExternalRules();
      if (decorate) {
        decorateExternalRules(externalRules);
      }

      const linter = new Linter();
      linter.defineRules(externalRules);

      const filePath = path.join(__dirname, 'fixtures', 'decorate', 'internal-decorator.js');
      const sourceCode = parseJavaScriptSourceFile(filePath) as SourceCode;

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

function getExternalRules() {
  const externalRules: { [key: string]: Rule.RuleModule } = {};
  const eslintRules = new Linter().getRules().entries();
  for (const [name, module] of eslintRules) {
    externalRules[name] = module;
  }
  for (const [name, module] of Object.entries(typescriptESLintRules)) {
    externalRules[name] = module;
  }
  return externalRules;
}
