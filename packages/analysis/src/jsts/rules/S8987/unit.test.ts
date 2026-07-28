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
import { RuleTester as ESLintRuleTester } from 'eslint';
import { describe, it } from 'node:test';

import parser from 'vue-eslint-parser';
import tsParser from '@typescript-eslint/parser';

const ruleTesterVue = new NoTypeCheckingRuleTester({ parser });

const ruleTesterVueTs = new ESLintRuleTester({
  files: ['**/*.vue'],
  languageOptions: {
    parser,
    parserOptions: { parser: tsParser },
  },
});

describe('S8987', () => {
  it('S8987 (decorated: vue/no-use-v-if-with-v-for)', () => {
    ruleTesterVue.run('"v-if" and "v-for" should not be used on the same element', rule, {
      valid: [
        {
          // v-if on parent, v-for on child
          code: `
<template>
  <ul v-if="showList">
    <li v-for="user in users" :key="user.id">{{ user.name }}</li>
  </ul>
</template>
`,
        },
        {
          // v-for with computed filtered list, no v-if on same element
          code: `
<template>
  <ul>
    <li v-for="user in activeUsers" :key="user.id">{{ user.name }}</li>
  </ul>
</template>
`,
        },
      ],
      invalid: [
        {
          // v-if references the v-for loop variable, iterable is an identifier → shouldUseComputed
          code: `
<template>
  <ul>
    <li v-for="user in users" v-if="user.active" :key="user.id">{{ user.name }}</li>
  </ul>
</template>
`,
          errors: [
            { message: 'Replace `users` with a computed property that returns a filtered array.' },
          ],
        },
        {
          // v-if references loop variable, iterable is an expression → shouldUseComputed with expression text
          code: `
<template>
  <ul>
    <li v-for="user in getUsers()" v-if="user.active" :key="user.id">{{ user.name }}</li>
  </ul>
</template>
`,
          errors: [
            {
              message:
                'Replace `getUsers()` with a computed property that returns a filtered array.',
            },
          ],
        },
        {
          // v-if unrelated to loop variable → movedToWrapper
          code: `
<template>
  <ul>
    <li v-for="user in users" v-if="showList" :key="user.id">{{ user.name }}</li>
  </ul>
</template>
`,
          errors: [{ message: 'Move this `v-if` to a parent element.' }],
        },
      ],
    });

    ruleTesterVueTs.run('"v-if" and "v-for" should not be used on the same element', rule, {
      valid: [
        {
          // TypeScript: v-if on parent, v-for on child with typed props
          filename: 'test.vue',
          code: `
<template>
  <ul v-if="showList">
    <li v-for="user in users" :key="user.id">{{ user.name }}</li>
  </ul>
</template>
<script setup lang="ts">
const props = defineProps<{ users: { name: string; active: boolean }[]; showList: boolean }>();
</script>
`,
        },
      ],
      invalid: [
        {
          // TypeScript: v-if references loop variable (shouldUseComputed)
          filename: 'test.vue',
          code: `
<template>
  <ul>
    <li v-for="user in users" v-if="user.active" :key="user.id">{{ user.name }}</li>
  </ul>
</template>
<script setup lang="ts">
const props = defineProps<{ users: { name: string; active: boolean }[] }>();
</script>
`,
          errors: [
            { message: 'Replace `users` with a computed property that returns a filtered array.' },
          ],
        },
        {
          // TypeScript: v-if unrelated to loop variable (movedToWrapper)
          filename: 'test.vue',
          code: `
<template>
  <ul>
    <li v-for="user in users" v-if="showList" :key="user.id">{{ user.name }}</li>
  </ul>
</template>
<script setup lang="ts">
const props = defineProps<{ users: { name: string }[]; showList: boolean }>();
</script>
`,
          errors: [{ message: 'Move this `v-if` to a parent element.' }],
        },
      ],
    });
  });
});
