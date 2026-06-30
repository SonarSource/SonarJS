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
import { rule } from './index.js';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

import parser from 'vue-eslint-parser';

const ruleTesterVue = new NoTypeCheckingRuleTester({ parser });

describe('S8950', () => {
  it('S8950 (external: vue/no-required-prop-with-default)', () => {
    ruleTesterVue.run('Props with default values should be optional', rule, {
      valid: [
        {
          // optional prop with a default
          code: `
      <script>
        export default {
          props: { name: { type: String, required: false, default: 'Hello' } }
        };
      </script>
      `,
        },
        {
          // required prop without a default
          code: `
      <script>
        export default {
          props: { name: { type: String, required: true } }
        };
      </script>
      `,
        },
        {
          // default without 'required' (implicitly optional)
          code: `
      <script>
        export default {
          props: { name: { type: String, default: 'Hello' } }
        };
      </script>
      `,
        },
      ],
      invalid: [
        {
          // required AND default -> contradictory
          code: `
      <script>
        export default {
          props: { name: { type: String, required: true, default: 'Hello' } }
        };
      </script>
      `,
          errors: 1,
        },
        {
          // same contradiction with <script setup> + defineProps
          code: `
      <script setup>
        defineProps({ name: { type: String, required: true, default: 'Hello' } });
      </script>
      `,
          errors: 1,
        },
      ],
    });
  });
});
