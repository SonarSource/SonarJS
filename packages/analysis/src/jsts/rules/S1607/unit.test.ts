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
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';
import { describe, it } from 'node:test';
import path from 'node:path';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { Linter } from 'eslint';
import { expect } from 'expect';

describe('S1607', () => {
  it('finds a package.json above the ESLint working directory for Node tests', t => {
    const project = fs.mkdtempSync(path.join(tmpdir(), 'sonarjs-node-test-'));
    t.after(() => fs.rmSync(project, { recursive: true, force: true }));
    const cwd = path.join(project, 'app');
    fs.mkdirSync(path.join(project, '.git'));
    fs.mkdirSync(cwd);
    fs.writeFileSync(path.join(project, 'package.json'), '{"private":true}');
    const filename = path.join(cwd, 'test.js');
    const code = "const test = require('node:test'); test('skipped', { skip: true }, () => {});";

    const lint = (settings: Record<string, unknown> = {}) =>
      new Linter({ cwd }).verify(
        code,
        {
          plugins: { sonarjs: { rules: { 'no-skipped-tests': rule } } },
          rules: { 'sonarjs/no-skipped-tests': 'error' },
          settings,
        },
        filename,
      );

    expect(lint().map(message => message.message)).toEqual([
      'Remove this unit test or explain why it is ignored.',
    ]);
    expect(lint({ sonarRuntime: true })).toHaveLength(0);
  });

  it('S1607', () => {
    const ruleTester = new DefaultParserRuleTester();
    const noFrameworkFixture = path.join(import.meta.dirname, 'fixtures', 'test.js');

    ruleTester.run(`Tests should not be skipped without providing a reason`, rule, {
      valid: [
        {
          code: `it.skip('test', function() {});`,
          filename: noFrameworkFixture,
        },
      ],
      invalid: [],
    });
  });
});
