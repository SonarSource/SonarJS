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
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S4721', () => {
  it('S4721', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('Executing OS commands is security-sensitive', rule, {
      valid: [
        {
          code: `
        const cp = require('child_process');
        cp.fork('child.js');
        `,
        },
        {
          code: `
        import { fork } from 'child_process';
        fork('child.js');`,
        },
        {
          code: `
        const cp = require('child_process');
        cp.exec('echo child_process.exec hardcoded >> output.txt');`,
        },
        {
          code: `
        const cp = require('child_process');
        cp.spawn('echo child_process.exec hardcoded >> output.txt', { shell: true });`,
        },
        {
          code: `
        const cp = require('child_process');
        cp.spawn('echo child_process.spawn ' + userinput + ' >> output.txt', { shell: false });`,
        },
        {
          code: `
        const cp = require('child_process');
        cp.spawn('echo child_process.spawn ' + userinput + ' >> output.txt');`,
        },
        {
          code: `
      const exec = require('child_process').fork;
      exec('echo child_process.exec ' + process.argv[2] + ' >> output.txt');`,
        },
        {
          code: `
        import * as cp from 'child_process';
        cp.spawn('echo child_process.exec ' + process.argv[2] + ' >> output.txt', { ...x });`,
        },
        {
          code: `
        import { execSync } from 'child_process';
        execSync(\`echo 'hello, world!'\`);`,
        },
      ],
      invalid: [
        {
          code: `
        const cp = require('child_process');
        cp.exec('echo child_process.exec ' + userInput + ' >> output.txt');
        `,
          errors: [
            {
              message: 'Make sure that executing this OS command is safe here.',
              line: 3,
              endLine: 3,
              column: 9,
              endColumn: 16,
            },
          ],
        },
        {
          code: `
        import * as cp from 'child_process';
        cp.exec('echo child_process.exec ' + process.argv[2] + ' >> output.txt');`,
          errors: 1,
        },
        {
          code: `
        import { exec } from 'child_process';
        exec('echo child_process.exec ' + process.argv[2] + ' >> output.txt');`,
          errors: 1,
        },
        {
          code: `
        import * as cp from 'child_process';
        cp.spawn('echo child_process.exec ' + process.argv[2] + ' >> output.txt', { shell: true });`,
          errors: 1,
        },
        {
          code: `
      import * as cp from 'child_process';
      cp.exec('echo child_process.exec ' + process.argv[2] + ' >> output.txt', { env: "" });`,
          errors: 1,
        },
        {
          code: `
      const exec = require('child_process').exec;
      exec('echo child_process.exec ' + process.argv[2] + ' >> output.txt');`,
          errors: 1,
        },
        {
          code: `
      var execSync = require('child_process').execSync
      function exec(command) {
        execSync(command, { stdio: [0, 1, 2] })
      }
      `,
          errors: 1,
        },
      ],
    });
  });
});
