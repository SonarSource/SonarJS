/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import { rule } from './index.js';
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S6759', () => {
  it('S6759 should not crash on return outside function', () => {
    const ruleTester = new RuleTester();
    ruleTester.run('S6759', rule, {
      valid: [
        {
          // JS-487: return outside function should not crash
          code: `
const fs = require('fs');
const path = require('path');
const certOutputBase = path.resolve('out', 'cert');
if (fs.existsSync(certOutputBase)) {
    return;
}
          `,
        },
      ],
      invalid: [],
    });
  });
});
