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
import { describe, it } from 'node:test';
import path from 'node:path';
import { rule } from './rule.js';

describe('S8960', () => {
  it('S8960', () => {
    const ruleTester = new DefaultParserRuleTester();
    const fixture = (folder: string) =>
      path.join(import.meta.dirname, 'fixtures', folder, 'test.js');
    const noFrameworkFixture = path.join(import.meta.dirname, 'fixtures', 'test.js');

    ruleTester.run(
      'Test and hook callbacks should not use both "async" and a completion callback',
      rule,
      {
        valid: [
          {
            code: `import { it } from '@jest/globals';
it('loads config', async () => {
  await loadConfig();
});`,
            filename: fixture('jest-globals'),
          },
          {
            code: `import { it } from '@jest/globals';
it('loads config', done => {
  loadConfig().then(() => done());
});`,
            filename: fixture('jest-globals'),
          },
          {
            code: `import { it } from '@jest/globals';
it('loads config', async () => {
  await new Promise(async done => {
    await loadConfig();
    done();
  });
});`,
            filename: fixture('jest-globals'),
          },
          {
            code: `it('loads config', async done => {
  await loadConfig();
  done();
});`,
            filename: noFrameworkFixture,
          },
          {
            code: `import { describe } from '@jest/globals';
describe('shadowed', () => {
  const it = (name, callback) => {};
  it('loads config', async done => {
    await loadConfig();
    done();
  });
});`,
            filename: fixture('jest-globals'),
          },
        ],
        invalid: [
          {
            code: `import { it } from '@jest/globals';
it('loads config', async done => {
  await loadConfig();
  done();
});`,
            filename: fixture('jest-globals'),
            errors: [{ messageId: 'singleCompletionStyle' }],
          },
          {
            code: `import { it } from '@jest/globals';
it('loads config', async done => {
  await loadConfig();
  done();
}, 5_000);`,
            filename: fixture('jest-globals'),
            errors: [{ messageId: 'singleCompletionStyle' }],
          },
          {
            code: `import { beforeEach } from 'mocha';
beforeEach(async done => {
  connectToDatabase(error => done(error));
});`,
            filename: fixture('mocha-globals'),
            errors: [{ messageId: 'singleCompletionStyle' }],
          },
          {
            code: `import * as jestGlobals from '@jest/globals';
jestGlobals.it('loads config', async done => {
  await loadConfig();
  done();
});`,
            filename: fixture('jest-globals'),
            errors: [{ messageId: 'singleCompletionStyle' }],
          },
          {
            code: `it('loads config', async done => {
  await loadConfig();
  done();
});`,
            filename: fixture('jasmine-globals'),
            errors: [{ messageId: 'singleCompletionStyle' }],
          },
        ],
      },
    );
  });
});
