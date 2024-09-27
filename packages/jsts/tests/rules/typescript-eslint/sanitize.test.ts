/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import pkg from '@typescript-eslint/eslint-plugin';
const { rules: typescriptESLintRules } = pkg;
import { Linter } from 'eslint';
import { sanitize } from '../../../src/rules/typescript-eslint/sanitize.js';
import path from 'path';
import { parseTypeScriptSourceFile } from '../../tools/helpers/index.js';

const cases = [
  {
    action: 'prevent',
    typing: 'available',
    tsConfigFiles: [],
    issues: 0,
  },
  {
    action: 'let',
    typing: 'missing',
    tsConfigFiles: ['tsconfig.json'],
    issues: 1,
  },
];

describe('sanitize', () => {
  test.each(cases)(
    'should $action a sanitized rule raise issues when type information is $typing',
    async ({ tsConfigFiles, issues }) => {
      const ruleId = 'prefer-readonly';
      const sanitizedRule = sanitize(typescriptESLintRules[ruleId]);

      const linter = new Linter();
      linter.defineRule(ruleId, sanitizedRule);

      const fixtures = path.join(import.meta.dirname, 'fixtures', 'sanitize');
      const filePath = path.join(fixtures, 'file.ts');
      const tsConfigs = tsConfigFiles.map(file => path.join(fixtures, file));

      const sourceCode = await parseTypeScriptSourceFile(filePath, tsConfigs);
      const rules = { [ruleId]: 'error' } as any;

      const messages = linter.verify(sourceCode, { rules });
      expect(messages).toHaveLength(issues);
    },
  );
});
