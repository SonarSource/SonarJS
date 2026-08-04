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
import { describe, it } from 'node:test';
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';

const LODASH_MESSAGE =
  'Mutating a nested property of this _.clone() changes the original value; use structuredClone() or _.cloneDeep() when isolation is required.';
const UNDERSCORE_MESSAGE =
  'Mutating a nested property of this _.clone() changes the original value; use structuredClone() when isolation is required.';

describe('S9135', () => {
  it('reports nested mutations of shallow clones and offers both suggestions', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run('avoid-mutating-nested-properties-of-shallow-clones', rule, {
      valid: [
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
copy.address.city;
`,
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
const alias = copy;
alias.address.city = 'Geneva';
`,
        },
        {
          code: `
import _ from 'lodash';
let copy = _.clone(user);
copy = other;
copy.address.city = 'Geneva';
`,
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
function update() {
  copy.address.city = 'Geneva';
}
`,
        },
        {
          code: `
import _ from 'lodash';
for (const user of users) {
  const copy = _.clone(user);
  copy.address.city = 'Geneva';
}
`,
        },
        {
          code: `
const copy = clone(user);
copy.address.city = 'Geneva';
`,
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
copy['address'].city = 'Geneva';
`,
        },
      ],
      invalid: [
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
copy.address.city = 'Geneva';
`,
          errors: [
            {
              message: LODASH_MESSAGE,
              suggestions: [
                {
                  desc: 'Replace the shallow clone with structuredClone()',
                  output: `
import _ from 'lodash';
const copy = structuredClone(user);
copy.address.city = 'Geneva';
`,
                },
                {
                  desc: 'Add // NOSONAR: shared nested state is intentional',
                  output: `
import _ from 'lodash';
const copy = _.clone(user);
copy.address.city = 'Geneva'; // NOSONAR: shared nested state is intentional
`,
                },
              ],
            },
          ],
        },
        {
          code: `
import clone from 'lodash/clone';
const copy = clone(user);
copy.settings.retryCount++;
`,
          errors: [
            {
              message: LODASH_MESSAGE,
              suggestions: [
                {
                  desc: 'Replace the shallow clone with structuredClone()',
                  output: `
import clone from 'lodash/clone';
const copy = structuredClone(user);
copy.settings.retryCount++;
`,
                },
                {
                  desc: 'Add // NOSONAR: shared nested state is intentional',
                  output: `
import clone from 'lodash/clone';
const copy = clone(user);
copy.settings.retryCount++; // NOSONAR: shared nested state is intentional
`,
                },
              ],
            },
          ],
        },
        {
          code: `
import { clone } from 'lodash-es';
const copy = clone(user);
delete copy.address.city;
`,
          errors: [
            {
              message: LODASH_MESSAGE,
              suggestions: [
                {
                  desc: 'Replace the shallow clone with structuredClone()',
                  output: `
import { clone } from 'lodash-es';
const copy = structuredClone(user);
delete copy.address.city;
`,
                },
                {
                  desc: 'Add // NOSONAR: shared nested state is intentional',
                  output: `
import { clone } from 'lodash-es';
const copy = clone(user);
delete copy.address.city; // NOSONAR: shared nested state is intentional
`,
                },
              ],
            },
          ],
        },
        {
          code: `
import _ from 'underscore';
const copy = _.clone(user);
copy.address.city = 'Geneva';
`,
          errors: [
            {
              message: UNDERSCORE_MESSAGE,
              suggestions: [
                {
                  desc: 'Replace the shallow clone with structuredClone()',
                  output: `
import _ from 'underscore';
const copy = structuredClone(user);
copy.address.city = 'Geneva';
`,
                },
                {
                  desc: 'Add // NOSONAR: shared nested state is intentional',
                  output: `
import _ from 'underscore';
const copy = _.clone(user);
copy.address.city = 'Geneva'; // NOSONAR: shared nested state is intentional
`,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it('reports the clone call as a secondary location in Sonar runtime mode', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run('avoid-mutating-nested-properties-of-shallow-clones', rule, {
      valid: [],
      invalid: [
        {
          code: `import _ from 'lodash';\nconst copy = _.clone(user);\ncopy.address.city = 'Geneva';`,
          settings: { sonarRuntime: true },
          errors: [
            {
              message: JSON.stringify({
                message: LODASH_MESSAGE,
                secondaryLocations: [
                  {
                    message: 'Shallow clone created here.',
                    column: 13,
                    line: 2,
                    endColumn: 26,
                    endLine: 2,
                  },
                ],
              }),
              suggestions: [
                {
                  desc: 'Replace the shallow clone with structuredClone()',
                  output: `import _ from 'lodash';\nconst copy = structuredClone(user);\ncopy.address.city = 'Geneva';`,
                },
                {
                  desc: 'Add // NOSONAR: shared nested state is intentional',
                  output: `import _ from 'lodash';\nconst copy = _.clone(user);\ncopy.address.city = 'Geneva'; // NOSONAR: shared nested state is intentional`,
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
