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

describe('S8952', () => {
  it('S8952 (external: vue/require-prop-types)', () => {
    ruleTesterVue.run('Vue component props should declare their type', rule, {
      valid: [
        {
          // shorthand type
          code: `<script>export default { props: { status: String } };</script>`,
        },
        {
          // object with type
          code: `<script>export default { props: { status: { type: String, required: true } } };</script>`,
        },
        {
          // type-based defineProps
          code: `<script setup lang="ts">defineProps<{ status: string }>();</script>`,
        },
      ],
      invalid: [
        {
          // array syntax - no type
          code: `<script>export default { props: ['status'] };</script>`,
          errors: 1,
        },
        {
          // object without type
          code: `<script>export default { props: { status: {} } };</script>`,
          errors: 1,
        },
      ],
    });
  });
});
