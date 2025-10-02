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
import { StylelintRuleTester } from '../../../tests/tools/tester/index.js';
import { rule, messages } from './rule.js';
import { describe, it } from 'node:test';

const ruleTester = new StylelintRuleTester(rule.ruleName);
describe('S7424', () => {
  it('Good contrast', () =>
    ruleTester.valid({
      codeFilename: 'goodContrast.html',
      code: '<p style="color: #333; background: #FFF;">Some text in a human language</p>',
    }));

  it('Bad contrast', () =>
    ruleTester.invalid({
      codeFilename: 'badContrast.html',
      code: '<p style="color: #AAA; background: white;">Some text in a human language</p>',
      errors: [{ text: messages.contrast, line: 1, column: 7 }],
    }));
});
