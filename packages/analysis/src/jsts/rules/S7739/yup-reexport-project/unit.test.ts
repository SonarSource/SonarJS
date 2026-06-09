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
import { rule } from '../rule.js';
import { join } from 'node:path/posix';
import { NoTypeCheckingRuleTester } from '../../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe } from 'node:test';

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
    ],
    invalid: [
      {
        // Non-yup code still flagged in a strapi-utils project
        code: `const schema = { then: function() { return this; } };`,
        filename: join(dirname, 'filename.js'),
        errors: [{ messageId: 'no-thenable-object' }],
      },
      {
        // Unrelated package that exports a 'yup' member: not a trusted re-exporter, should be flagged
        code: `
          const { yup } = require("my-lib");
          yup.mixed().when("x", { is: true, then: yup.string() });
        `,
        filename: join(dirname, 'filename.js'),
        errors: [{ messageId: 'no-thenable-object' }],
      },
    ],
  });
});
