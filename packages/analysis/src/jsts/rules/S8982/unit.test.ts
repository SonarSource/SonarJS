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

describe('S8982', () => {
  it('S8982', () => {
    ruleTesterVue.run("Add a ':key' binding to this element.", rule, {
      valid: [
        {
          // native element with v-for and :key
          code: `
<template>
  <ul>
    <li v-for="todo in todos" :key="todo.id">{{ todo.text }}</li>
  </ul>
</template>
`,
        },
        {
          // native element with v-for and v-bind:key
          code: `
<template>
  <ul>
    <li v-for="item in items" v-bind:key="item.id">{{ item }}</li>
  </ul>
</template>
`,
        },
        {
          // custom component with v-for and no :key (out of scope for this rule)
          code: `
<template>
  <MyComponent v-for="item in items">{{ item }}</MyComponent>
</template>
`,
        },
        {
          // element without v-for
          code: `
<template>
  <li>static item</li>
</template>
`,
        },
      ],
      invalid: [
        {
          // native element with v-for and no :key
          code: `
<template>
  <ul>
    <li v-for="todo in todos">{{ todo.text }}</li>
  </ul>
</template>
`,
          errors: [{ message: "Add a ':key' binding to this element." }],
        },
        {
          // nested v-for without :key on inner element
          code: `
<template>
  <div v-for="group in groups" :key="group.id">
    <span v-for="item in group.items">{{ item }}</span>
  </div>
</template>
`,
          errors: [{ message: "Add a ':key' binding to this element." }],
        },
      ],
    });
  });
});
