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
import { rules } from '../../external/unicorn.js';
import { rule } from '../rule.js';
import { join } from 'node:path/posix';
import { NoTypeCheckingRuleTester } from '../../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

const upstreamRule = rules['no-thenable'];

// Sentinel: verify that the upstream ESLint rule still raises on the patterns our decorator fixes.
// If this test starts failing (i.e., the upstream rule no longer reports these patterns),
// it signals that the decorator can be safely removed.
describe('S7739 upstream sentinel', () => {
  it('upstream no-thenable raises on re-exported yup .when() config that decorator suppresses', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    ruleTester.run('no-thenable', upstreamRule, {
      valid: [],
      invalid: [
        {
          // Yup via strapi-utils re-export with {is, then} config — suppressed by decorator, raised by upstream
          code: `
const { yup } = require('strapi-utils');
yup.mixed().when('section', {
  is: 'plugins',
  then: yup.string().required(),
});
          `,
          errors: 1,
        },
      ],
    });
  });
});

describe('S7739', () => {
  const dirname = join(import.meta.dirname, 'fixtures');
  process.chdir(dirname); // change current working dir to avoid the package.json lookup going up the tree
  const ruleTester = new NoTypeCheckingRuleTester();
  ruleTester.run('S7739 skips yup accessed via re-exporting package', rule, {
    valid: [
      {
        // Yup via strapi-utils re-export: FQN contains interior '.yup.' segment
        code: `
          const { yup } = require('strapi-utils');
          const schema = yup.object().shape({
            pluginName: yup.mixed().when('section', {
              is: 'plugins',
              then: yup.string().required(),
              otherwise: yup.string(),
            }),
          });
        `,
        filename: join(dirname, 'filename.js'),
      },
      {
        // Multiple .when() calls with re-exported yup
        code: `
          const { yup } = require('strapi-utils');
          const schema = yup.object().shape({
            pluginName: yup.mixed().when('section', {
              is: 'plugins',
              then: yup.string().required(),
              otherwise: yup.string(),
            }),
            subjects: yup.mixed().when('section', {
              is: 'contentTypes',
              then: yup.array().of(yup.string()),
              otherwise: yup.mixed(),
            }),
          });
        `,
        filename: join(dirname, 'filename.js'),
      },
      {
        // FP: yup re-exported through an arbitrary package — FQN 'my-lib.yup.mixed.when' contains
        // interior '.yup.' segment, so the rule should suppress it just like strapi-utils.yup
        code: `
          const { yup } = require('my-lib');
          yup.mixed().when('x', { is: true, then: yup.string() });
        `,
        filename: join(dirname, 'filename.js'),
      },
    ],
    invalid: [
      {
        // Non-yup code still flagged in a strapi-utils project
        code: `const schema = { then: function() { return this; } };`,
        filename: join(dirname, 'filename.js'),
        errors: [{ messageId: 'no-thenable-object' }],
      },
    ],
  });
});
