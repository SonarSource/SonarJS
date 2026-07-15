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
import { RuleTester as ESLintRuleTester } from 'eslint';

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

describe('S9019', () => {
  it('S9019 (decorated: vue/no-ref-as-operand)', () => {
    ruleTesterVue.run('Vue refs should not be used as operands', rule, {
      valid: [
        {
          // ref() unwrapped correctly, both read and write
          code: `
<script setup>
import { ref, computed } from 'vue';
const count = ref(0);
const doubled = computed(() => count.value * 2);
function increment() {
  count.value++;
}
</script>
`,
        },
        {
          // computed() unwrapped correctly in a condition
          code: `
<script setup>
import { ref, computed } from 'vue';
const items = ref([]);
const hasItems = computed(() => items.value.length > 0);
if (hasItems.value) {
  console.log('has items');
}
</script>
`,
        },
      ],
      invalid: [
        {
          // ref() used directly in an UpdateExpression
          code: `
<script setup>
import { ref } from 'vue';
let count = ref(0);
function increment() {
  count++;
}
</script>
`,
          output: `
<script setup>
import { ref } from 'vue';
let count = ref(0);
function increment() {
  count.value++;
}
</script>
`,
          errors: [{ message: "Add '.value' to read or write the value wrapped by 'ref()'." }],
        },
        {
          // computed() used directly as an IfStatement condition
          code: `
<script setup>
import { computed, ref } from 'vue';
const items = ref([]);
const hasItems = computed(() => items.value.length > 0);
if (hasItems) {
  console.log('yes');
}
</script>
`,
          output: `
<script setup>
import { computed, ref } from 'vue';
const items = ref([]);
const hasItems = computed(() => items.value.length > 0);
if (hasItems.value) {
  console.log('yes');
}
</script>
`,
          errors: [{ message: "Add '.value' to read or write the value wrapped by 'computed()'." }],
        },
        {
          // toRef() used directly in a BinaryExpression
          code: `
<script setup>
import { reactive, toRef } from 'vue';
const state = reactive({ foo: 1 });
const foo = toRef(state, 'foo');
const doubled = foo * 2;
</script>
`,
          output: `
<script setup>
import { reactive, toRef } from 'vue';
const state = reactive({ foo: 1 });
const foo = toRef(state, 'foo');
const doubled = foo.value * 2;
</script>
`,
          errors: [{ message: "Add '.value' to read or write the value wrapped by 'toRef()'." }],
        },
        {
          // customRef() used directly inside a template literal
          code: `
<script setup>
import { customRef } from 'vue';
const foo = customRef((track, trigger) => ({
  get() {
    track();
    return 0;
  },
  set() {
    trigger();
  },
}));
const label = \`Value: \${foo}\`;
</script>
`,
          output: `
<script setup>
import { customRef } from 'vue';
const foo = customRef((track, trigger) => ({
  get() {
    track();
    return 0;
  },
  set() {
    trigger();
  },
}));
const label = \`Value: \${foo.value}\`;
</script>
`,
          errors: [
            { message: "Add '.value' to read or write the value wrapped by 'customRef()'." },
          ],
        },
        {
          // shallowRef() assigned to directly instead of through .value
          code: `
<script setup>
import { shallowRef } from 'vue';
let count = shallowRef(0);
count = 5;
</script>
`,
          output: `
<script setup>
import { shallowRef } from 'vue';
let count = shallowRef(0);
count.value = 5;
</script>
`,
          errors: [
            { message: "Add '.value' to read or write the value wrapped by 'shallowRef()'." },
          ],
        },
        {
          // toRefs() destructured ref used directly in an UpdateExpression
          code: `
<script setup>
import { reactive, toRefs } from 'vue';
const state = reactive({ count: 0 });
let { count } = toRefs(state);
count++;
</script>
`,
          output: `
<script setup>
import { reactive, toRefs } from 'vue';
const state = reactive({ count: 0 });
let { count } = toRefs(state);
count.value++;
</script>
`,
          errors: [{ message: "Add '.value' to read or write the value wrapped by 'toRefs()'." }],
        },
        {
          // defineModel() used directly as an IfStatement condition
          code: `
<script setup>
const modelValue = defineModel();
if (modelValue) {
  console.log('has value');
}
</script>
`,
          output: `
<script setup>
const modelValue = defineModel();
if (modelValue.value) {
  console.log('has value');
}
</script>
`,
          errors: [
            { message: "Add '.value' to read or write the value wrapped by 'defineModel()'." },
          ],
        },
      ],
    });

    ruleTesterVueTs.run('Vue refs should not be used as operands', rule, {
      valid: [
        {
          // TypeScript: ref() unwrapped correctly
          filename: 'test.vue',
          code: `
<script setup lang="ts">
import { ref } from 'vue';
const count = ref<number>(0);
function increment() {
  count.value++;
}
</script>
`,
        },
      ],
      invalid: [
        {
          // TypeScript: ref() used directly in an UpdateExpression
          filename: 'test.vue',
          code: `
<script setup lang="ts">
import { ref } from 'vue';
let count = ref<number>(0);
function increment() {
  count++;
}
</script>
`,
          output: `
<script setup lang="ts">
import { ref } from 'vue';
let count = ref<number>(0);
function increment() {
  count.value++;
}
</script>
`,
          errors: [{ message: "Add '.value' to read or write the value wrapped by 'ref()'." }],
        },
      ],
    });
  });
});
