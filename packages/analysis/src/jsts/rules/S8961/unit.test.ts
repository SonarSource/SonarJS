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

describe('S8961', () => {
  it('S8961 (external: vue/require-explicit-emits)', () => {
    ruleTesterVue.run('Vue component emits should be explicitly declared', rule, {
      valid: [
        {
          // emits declared in options API
          code: `<script>export default { emits: ['submit'], methods: { s() { this.$emit('submit'); } } };</script>`,
        },
        {
          // defineEmits in script setup
          code: `<script setup>const emit = defineEmits(['submit']); emit('submit');</script>`,
        },
      ],
      invalid: [
        {
          // options API - $emit without emits declaration
          code: `<script>export default { methods: { submit() { this.$emit('submit'); } } };</script>`,
          errors: 1,
        },
        {
          // script setup - emit not in defineEmits
          code: `<script setup>const emit = defineEmits([]); emit('submit');</script>`,
          errors: 1,
        },
      ],
    });
  });
});
