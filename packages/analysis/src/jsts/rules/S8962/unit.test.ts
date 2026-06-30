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

describe('S8954', () => {
  it('S8954 (external: vue/require-typed-ref)', () => {
    ruleTesterVue.run(
      'Vue ref() and shallowRef() should be called with a type or initial value',
      rule,
      {
        valid: [
          {
            // ref with initial value
            code: `<script setup>import { ref } from 'vue'; const count = ref(0);</script>`,
          },
          {
            // ref with explicit generic type
            code: `<script setup lang="ts">import { ref } from 'vue'; const data = ref<string[]>([]);</script>`,
          },
          {
            // shallowRef with initial value
            code: `<script setup>import { shallowRef } from 'vue'; const x = shallowRef('hello');</script>`,
          },
        ],
        invalid: [
          {
            // ref() with no argument
            code: `<script setup>import { ref } from 'vue'; const count = ref();</script>`,
            errors: 1,
          },
          {
            // shallowRef() with no argument
            code: `<script setup>import { shallowRef } from 'vue'; const data = shallowRef();</script>`,
            errors: 1,
          },
        ],
      },
    );
  });
});
