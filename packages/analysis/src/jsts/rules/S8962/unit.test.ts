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
import { RuleTester as ESLintRuleTester } from 'eslint';
import { describe, it } from 'node:test';
import parser from 'vue-eslint-parser';
import tsParser from '@typescript-eslint/parser';

const ruleTesterVue = new ESLintRuleTester({
  files: ['**/*.vue'],
  languageOptions: {
    parser,
    parserOptions: { parser: tsParser },
  },
});

describe('S8962', () => {
  it('S8962 (external: vue/require-typed-ref)', () => {
    ruleTesterVue.run(
      'Vue ref() and shallowRef() should be called with a type or initial value',
      rule,
      {
        valid: [
          {
            // ref with initial value
            filename: 'test.vue',
            code: `<script setup lang="ts">import { ref } from 'vue'; const count = ref(0);</script>`,
          },
          {
            // ref with explicit generic type
            filename: 'test.vue',
            code: `<script setup lang="ts">import { ref } from 'vue'; const data = ref<string[]>([]);</script>`,
          },
          {
            // shallowRef with initial value
            filename: 'test.vue',
            code: `<script setup lang="ts">import { shallowRef } from 'vue'; const x = shallowRef('hello');</script>`,
          },
        ],
        invalid: [
          {
            // ref() with no argument and no type parameter
            filename: 'test.vue',
            code: `<script setup lang="ts">import { ref } from 'vue'; const count = ref();</script>`,
            errors: 1,
          },
          {
            // shallowRef() with no argument and no type parameter
            filename: 'test.vue',
            code: `<script setup lang="ts">import { shallowRef } from 'vue'; const data = shallowRef();</script>`,
            errors: 1,
          },
        ],
      },
    );
  });
});
