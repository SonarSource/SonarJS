/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { Linter } from 'eslint';
import path from 'node:path';
import { describe, test } from 'node:test';
import { expect } from 'expect';
import { parseTypeScriptSourceFile } from '../../tools/helpers/parsing.js';
import { rules } from '../../../src/rules/external/typescript-eslint/index.js';

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
  for (const { action, typing, tsConfigFiles, issues } of cases) {
    test(`should ${action} a sanitized rule raise issues when type information is ${typing}`, async () => {
      const ruleId = 'prefer-readonly';
      const fixtures = path.join(import.meta.dirname, 'fixtures', 'sanitize');
      const filePath = path.join(fixtures, 'file.ts');
      const tsConfigs = tsConfigFiles.map(file => path.join(fixtures, file));

      const { sourceCode } = await parseTypeScriptSourceFile(filePath, tsConfigs);

      const messages = new Linter().verify(sourceCode, {
        plugins: {
          sonarjs: { rules: { [ruleId]: rules[ruleId] } },
        },
        rules: { [`sonarjs/${ruleId}`]: 'error' },
      });
      expect(messages).toHaveLength(issues);
    });
  }
});
