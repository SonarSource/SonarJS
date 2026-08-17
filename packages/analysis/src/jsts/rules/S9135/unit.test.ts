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
import { RuleTester as ESLintRuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { rule } from './rule.js';

const LODASH_MESSAGE =
  'Mutating a nested property of this shallow clone changes the original value; use structuredClone() or _.cloneDeep() when isolation is required.';
const UNDERSCORE_MESSAGE =
  'Mutating a nested property of this shallow clone changes the original value; use structuredClone() when isolation is required.';

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
let copy = _.clone(user);
copy.address.city = 'Geneva'; // Compliant: later reassignment
copy = other;
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
copy[address].city = 'Geneva';
`,
        },
        {
          code: `
import _ from 'lodash';
const config = _.clone(tlConfig);
if (offset) {
  config.time = _.cloneDeep(tlConfig.time);
  config.time.from = offsetTime(config.time.from, offset); // Compliant: nested object replaced
  config.time.to = offsetTime(config.time.to, offset);
}
`,
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
copy.address = structuredClone(user.address);
copy.address.city = 'Geneva'; // Compliant: nested object replaced
`,
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
copy.address = {};
copy.address.city = 'Geneva'; // Compliant: nested object replaced
`,
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
copy.address = _.clone(user.address);
copy.address.city = 'Geneva'; // Compliant: one-level write on replaced object
`,
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
copy.address = _.cloneDeep(user.address);
if (enabled) {
  copy.address.geo.lat = 1; // Compliant: dominating deep clone
}
`,
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
{
  copy.address = _.cloneDeep(user.address);
}
copy.address.city = 'Geneva'; // Compliant: same binding
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
import _ from 'lodash';
function process() {
  const copy = _.clone(user);
  items.forEach(() => {
    copy.address.city = 'Geneva';
  });
}
`,
          errors: [
            {
              message: LODASH_MESSAGE,
              suggestions: [
                {
                  desc: 'Replace the shallow clone with structuredClone()',
                  output: `
import _ from 'lodash';
function process() {
  const copy = structuredClone(user);
  items.forEach(() => {
    copy.address.city = 'Geneva';
  });
}
`,
                },
                {
                  desc: 'Add // NOSONAR: shared nested state is intentional',
                  output: `
import _ from 'lodash';
function process() {
  const copy = _.clone(user);
  items.forEach(() => {
    copy.address.city = 'Geneva'; // NOSONAR: shared nested state is intentional
  });
}
`,
                },
              ],
            },
          ],
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
function update() {
  copy.address.city = 'Geneva';
}
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
function update() {
  copy.address.city = 'Geneva';
}
`,
                },
                {
                  desc: 'Add // NOSONAR: shared nested state is intentional',
                  output: `
import _ from 'lodash';
const copy = _.clone(user);
function update() {
  copy.address.city = 'Geneva'; // NOSONAR: shared nested state is intentional
}
`,
                },
              ],
            },
          ],
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
copy.items[0].name = 'x';
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
copy.items[0].name = 'x';
`,
                },
                {
                  desc: 'Add // NOSONAR: shared nested state is intentional',
                  output: `
import _ from 'lodash';
const copy = _.clone(user);
copy.items[0].name = 'x'; // NOSONAR: shared nested state is intentional
`,
                },
              ],
            },
          ],
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
copy['address'].city = 'Geneva';
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
copy['address'].city = 'Geneva';
`,
                },
                {
                  desc: 'Add // NOSONAR: shared nested state is intentional',
                  output: `
import _ from 'lodash';
const copy = _.clone(user);
copy['address'].city = 'Geneva'; // NOSONAR: shared nested state is intentional
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
        {
          code: `
import _ from 'lodash';
for (const user of users) {
  const copy = _.clone(user);
  copy.address.city = 'Geneva';
}
`,
          errors: [
            {
              message: LODASH_MESSAGE,
              suggestions: [
                {
                  desc: 'Replace the shallow clone with structuredClone()',
                  output: `
import _ from 'lodash';
for (const user of users) {
  const copy = structuredClone(user);
  copy.address.city = 'Geneva';
}
`,
                },
                {
                  desc: 'Add // NOSONAR: shared nested state is intentional',
                  output: `
import _ from 'lodash';
for (const user of users) {
  const copy = _.clone(user);
  copy.address.city = 'Geneva'; // NOSONAR: shared nested state is intentional
}
`,
                },
              ],
            },
          ],
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
if (enabled) copy.address.city = 'Geneva'; else reset();
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
if (enabled) copy.address.city = 'Geneva'; else reset();
`,
                },
              ],
            },
          ],
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
const result = (copy.address.city = 'Geneva');
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
const result = (copy.address.city = 'Geneva');
`,
                },
                {
                  desc: 'Add // NOSONAR: shared nested state is intentional',
                  output: `
import _ from 'lodash';
const copy = _.clone(user);
const result = (copy.address.city = 'Geneva'); // NOSONAR: shared nested state is intentional
`,
                },
              ],
            },
          ],
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
if (!copy.address) copy.address = {};
copy.address.city = 'Geneva';
`,
          errors: 1,
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
copy.meta = _.cloneDeep(user.meta);
copy.address.city = 'Geneva';
`,
          errors: 1,
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
copy.address.city = 'Geneva';
copy.address = _.cloneDeep(user.address);
`,
          errors: 1,
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
copy.address = _.clone(user.address);
copy.address.geo.lat = 1;
`,
          errors: 1,
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
copy.address ||= {};
copy.address.city = 'Geneva';
`,
          errors: 1,
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
copy.address ??= {};
copy.address.city = 'Geneva';
`,
          errors: 1,
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
copy.address &&= {};
copy.address.city = 'Geneva';
`,
          errors: 1,
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
{
  const copy = other;
  copy.address = _.cloneDeep(user.address);
}
copy.address.city = 'Geneva';
`,
          errors: 1,
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
copy.address = _.cloneDeep(user.address);
copy.address = user.address;
copy.address.city = 'Geneva';
`,
          errors: 1,
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
copy.address = _.cloneDeep(user.address);
if (cond) { copy.address = user.address; }
copy.address.city = 'a';
`,
          errors: 1,
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
copy.address = _.cloneDeep(user.address);
try { copy.address = user.address; } catch (e) {}
copy.address.city = 'a';
`,
          errors: 1,
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
copy.address = _.cloneDeep(user.address);
for (const x of xs) { copy.address = user.address; }
copy.address.city = 'a';
`,
          errors: 1,
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
copy.address = _.cloneDeep(user.address);
switch (cond) { case 1: copy.address = user.address; }
copy.address.city = 'a';
`,
          errors: 1,
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
copy.address = _.cloneDeep(user.address);
label: copy.address = user.address;
copy.address.city = 'a';
`,
          errors: 1,
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
copy.address = _.cloneDeep(user.address);
cond && (copy.address = user.address);
copy.address.city = 'a';
`,
          errors: 1,
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
copy.address = _.cloneDeep(user.address);
cond ? (copy.address = user.address) : 0;
copy.address.city = 'a';
`,
          errors: 1,
        },
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
if (cond) copy.address = _.cloneDeep(user.address);
copy.address.city = 'Geneva';
`,
          errors: 1,
        },
      ],
    });
  });

  it('reports nested mutations through TypeScript non-null assertions', () => {
    const ruleTester = new ESLintRuleTester({
      languageOptions: { parser: tsParser },
    });

    ruleTester.run('avoid-mutating-nested-properties-of-shallow-clones', rule, {
      valid: [],
      invalid: [
        {
          code: `
import _ from 'lodash';
const copy = _.clone(user);
copy.address!.city = 'Geneva';
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
copy.address!.city = 'Geneva';
`,
                },
                {
                  desc: 'Add // NOSONAR: shared nested state is intentional',
                  output: `
import _ from 'lodash';
const copy = _.clone(user);
copy.address!.city = 'Geneva'; // NOSONAR: shared nested state is intentional
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
