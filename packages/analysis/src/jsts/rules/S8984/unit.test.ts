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

describe('S8984', () => {
  it('S8984', () => {
    ruleTesterVue.run('Vue v-for directives should be valid', rule, {
      valid: [
        {
          // native element with valid v-for and :key
          code: `
<template>
  <div v-for="item in items" :key="item.id">{{ item.name }}</div>
</template>
`,
        },
        {
          // custom component with valid v-for and :key bound to loop variable
          code: `
<template>
  <my-comp v-for="item in items" :key="item.id">{{ item.name }}</my-comp>
</template>
`,
        },
      ],
      invalid: [
        {
          // expectedValue: missing expression
          code: `
<template>
  <div v-for></div>
</template>
`,
          errors: [{ message: "'v-for' directives require that attribute value." }],
        },
        {
          // unexpectedArgument: argument not allowed
          code: `
<template>
  <div v-for:aaa="item in items" :key="item.id"></div>
</template>
`,
          errors: [{ message: "'v-for' directives require no argument." }],
        },
        {
          // unexpectedModifier: modifier not allowed
          code: `
<template>
  <div v-for.bbb="item in items" :key="item.id"></div>
</template>
`,
          errors: [{ message: "'v-for' directives require no modifier." }],
        },
        {
          // requireKey (custom message): custom component missing :key
          code: `
<template>
  <my-comp v-for="item in items">{{ item.name }}</my-comp>
</template>
`,
          errors: [{ message: "Add a ':key' binding to this custom component." }],
        },
        {
          // keyUseFVorVars (custom message): :key does not use v-for variable
          code: `
<template>
  <div v-for="item in items" :key="other.id">{{ item.name }}</div>
</template>
`,
          errors: [{ message: "':key' must use a variable defined by this 'v-for' directive." }],
        },
      ],
    });
  });
});
