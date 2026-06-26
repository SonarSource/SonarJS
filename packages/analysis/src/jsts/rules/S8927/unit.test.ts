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
import path from 'node:path/posix';
import { describe, it } from 'node:test';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';

const dirname = import.meta.dirname;
const fixtures = path.join(dirname, 'fixtures');

describe('S8927', () => {
  it('reports default imports from supported utility library versions', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    const filename = path.join(fixtures, 'supported', 'file.js');

    ruleTester.run('no-default-utility-imports', rule, {
      valid: [
        {
          code: `import type lodashEs from 'lodash-es';`,
          filename: path.join(fixtures, 'supported', 'file.ts'),
        },
        {
          code: `import _ from 'lodash-es';`,
          filename: path.join(fixtures, 'non-semver', 'file.js'),
        },
        {
          code: `
import lodash from 'lodash';
import lodashEs from 'lodash-es';
import rxjs from 'rxjs';
import R from 'rambda';
import validator from 'validator';
`,
          filename: path.join(fixtures, 'unsupported', 'file.js'),
        },
        {
          code: `
import _ from 'lodash/map';
import isEmail from 'validator/es/lib/isEmail';
import { map } from 'lodash-es';
import * as R from 'rambda';
import rxjs, * as Rx from 'rxjs';
import 'rxjs';
const lodash = require('lodash');
`,
          filename: path.join(fixtures, 'supported', 'file.js'),
        },
        {
          code: `import lodashEs from 'lodash-es';`,
          filename: path.join(fixtures, 'no-dependency', 'file.js'),
        },
      ],
      invalid: [
        {
          code: `
import lodash from 'lodash';
import lodashEs from 'lodash-es';
import rxjs from 'rxjs';
import R from 'rambda';
import validator from 'validator';
`,
          filename,
          errors: [
            {
              messageId: 'useMethodImports',
              data: { library: 'lodash', example: 'lodash/map' },
              line: 2,
              column: 1,
              endLine: 2,
              endColumn: 29,
            },
            {
              messageId: 'useNamedImports',
              data: { library: 'lodash-es' },
              line: 3,
              column: 1,
              endLine: 3,
              endColumn: 34,
            },
            {
              messageId: 'useNamedImports',
              data: { library: 'rxjs' },
              line: 4,
              column: 1,
              endLine: 4,
              endColumn: 25,
            },
            {
              messageId: 'useNamedImports',
              data: { library: 'rambda' },
              line: 5,
              column: 1,
              endLine: 5,
              endColumn: 24,
            },
            {
              messageId: 'useMethodImports',
              data: { library: 'validator', example: 'validator/es/lib/isEmail' },
              line: 6,
              column: 1,
              endLine: 6,
              endColumn: 35,
            },
          ],
        },
        {
          code: `
import lodashEs from 'lodash-es';

lodashEs.map(users, 'name');
lodashEs.filter(users, Boolean);
`,
          filename,
          errors: [
            {
              messageId: 'useNamedImports',
              data: { library: 'lodash-es' },
              line: 2,
              column: 1,
              endLine: 2,
              endColumn: 34,
            },
          ],
        },
        {
          code: `import lodashEs, { map } from 'lodash-es';`,
          filename,
          errors: [
            {
              messageId: 'useNamedImports',
              data: { library: 'lodash-es' },
            },
          ],
        },
        {
          code: `
import lodash from 'lodash';
import lodashEs from 'lodash-es';
import rxjs from 'rxjs';
import R from 'rambda';
import validator from 'validator';
`,
          filename: path.join(fixtures, 'unbounded', 'file.js'),
          errors: [
            {
              messageId: 'useMethodImports',
              data: { library: 'lodash', example: 'lodash/map' },
              line: 2,
              column: 1,
              endLine: 2,
              endColumn: 29,
            },
            {
              messageId: 'useNamedImports',
              data: { library: 'lodash-es' },
              line: 3,
              column: 1,
              endLine: 3,
              endColumn: 34,
            },
            {
              messageId: 'useNamedImports',
              data: { library: 'rxjs' },
              line: 4,
              column: 1,
              endLine: 4,
              endColumn: 25,
            },
            {
              messageId: 'useNamedImports',
              data: { library: 'rambda' },
              line: 5,
              column: 1,
              endLine: 5,
              endColumn: 24,
            },
            {
              messageId: 'useMethodImports',
              data: { library: 'validator', example: 'validator/es/lib/isEmail' },
              line: 6,
              column: 1,
              endLine: 6,
              endColumn: 35,
            },
          ],
        },
        {
          code: `import lodashEs from 'lodash-es';`,
          filename: path.join(fixtures, 'loose-semver', 'file.js'),
          errors: [
            {
              messageId: 'useNamedImports',
              data: { library: 'lodash-es' },
            },
          ],
        },
      ],
    });
  });
});
