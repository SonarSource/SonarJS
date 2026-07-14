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

const ruleTester = new NoTypeCheckingRuleTester({ parser });

const ruleTesterVueTs = new ESLintRuleTester({
  files: ['**/*.vue'],
  languageOptions: {
    parser,
    parserOptions: { parser: tsParser },
  },
});

describe('S9025', () => {
  it('S9025 (decorated: vue/no-async-in-computed-properties)', () => {
    ruleTester.run(
      'Asynchronous actions should not be performed inside computed properties',
      rule,
      {
        valid: [
          {
            // Options API computed property with no async action
            code: `
<script>
export default {
  data() {
    return { items: [3, 1, 2] };
  },
  computed: {
    sortedItems() {
      return [...this.items].sort((a, b) => a - b);
    }
  }
}
</script>
`,
          },
          {
            // Composition API computed function with no async action
            code: `
<script setup>
import { computed, ref } from 'vue';
const items = ref([3, 1, 2]);
const sortedItems = computed(() => {
  return [...items.value].sort((a, b) => a - b);
});
</script>
`,
          },
        ],
        invalid: [
          {
            // Options API: Promise chain (unexpectedInProperty, "asynchronous action")
            code: `
<script>
export default {
  computed: {
    data() {
      somePromise.then(value => value);
      return this.value;
    }
  }
}
</script>
`,
            errors: [
              { message: 'Move this asynchronous action out of the computed property "data".' },
            ],
          },
          {
            // Composition API: Promise chain (unexpectedInFunction, "asynchronous action")
            code: `
<script setup>
import { computed, ref } from 'vue';
const value = ref(0);
const data = computed(() => {
  somePromise.then(v => v);
  return value.value;
});
</script>
`,
            errors: [{ message: 'Move this asynchronous action out of the computed function.' }],
          },
          {
            // Options API: this.$nextTick (unexpectedInProperty, "asynchronous action")
            code: `
<script>
export default {
  computed: {
    data() {
      this.$nextTick(() => {});
      return this.value;
    }
  }
}
</script>
`,
            errors: [
              { message: 'Move this asynchronous action out of the computed property "data".' },
            ],
          },
          {
            // Composition API: Vue.nextTick (unexpectedInFunction, "asynchronous action")
            code: `
<script setup>
import { computed, ref } from 'vue';
const value = ref(0);
const data = computed(() => {
  Vue.nextTick(() => {});
  return value.value;
});
</script>
`,
            errors: [{ message: 'Move this asynchronous action out of the computed function.' }],
          },
          {
            // Options API: await operator (unexpectedInProperty, "await operator")
            // The enclosing method must itself be `async`, which also triggers the
            // "async function declaration" report.
            code: `
<script>
export default {
  computed: {
    async data() {
      await fetchData();
      return this.value;
    }
  }
}
</script>
`,
            errors: [
              {
                message:
                  'Move this async function declaration out of the computed property "data".',
              },
              { message: 'Move this await operator out of the computed property "data".' },
            ],
          },
          {
            // Composition API: await operator (unexpectedInFunction, "await operator")
            code: `
<script setup>
import { computed, ref } from 'vue';
const value = ref(0);
const data = computed(async () => {
  await fetchData();
  return value.value;
});
</script>
`,
            errors: [
              { message: 'Move this async function declaration out of the computed function.' },
              { message: 'Move this await operator out of the computed function.' },
            ],
          },
          {
            // Options API: async function declaration alone (unexpectedInProperty, "async function declaration")
            code: `
<script>
export default {
  computed: {
    async data() {
      return this.value;
    }
  }
}
</script>
`,
            errors: [
              {
                message:
                  'Move this async function declaration out of the computed property "data".',
              },
            ],
          },
          {
            // Composition API: async function declaration alone (unexpectedInFunction, "async function declaration")
            code: `
<script setup>
import { computed, ref } from 'vue';
const value = ref(0);
const data = computed(async () => {
  return value.value;
});
</script>
`,
            errors: [
              { message: 'Move this async function declaration out of the computed function.' },
            ],
          },
          {
            // Options API: new Promise (unexpectedInProperty, "Promise object")
            code: `
<script>
export default {
  computed: {
    data() {
      new Promise((resolve) => resolve(this.value));
      return this.value;
    }
  }
}
</script>
`,
            errors: [{ message: 'Move this Promise object out of the computed property "data".' }],
          },
          {
            // Composition API: new Promise (unexpectedInFunction, "Promise object")
            code: `
<script setup>
import { computed, ref } from 'vue';
const value = ref(0);
const data = computed(() => {
  new Promise((resolve) => resolve(value.value));
  return value.value;
});
</script>
`,
            errors: [{ message: 'Move this Promise object out of the computed function.' }],
          },
          {
            // Options API: timed function (unexpectedInProperty, "timed function")
            code: `
<script>
export default {
  computed: {
    data() {
      setTimeout(() => {}, 100);
      return this.value;
    }
  }
}
</script>
`,
            errors: [{ message: 'Move this timed function out of the computed property "data".' }],
          },
          {
            // Composition API: timed function (unexpectedInFunction, "timed function")
            code: `
<script setup>
import { computed, ref } from 'vue';
const value = ref(0);
const data = computed(() => {
  setInterval(() => {}, 100);
  return value.value;
});
</script>
`,
            errors: [{ message: 'Move this timed function out of the computed function.' }],
          },
        ],
      },
    );

    ruleTesterVueTs.run(
      'Asynchronous actions should not be performed inside computed properties',
      rule,
      {
        valid: [
          {
            // TypeScript: Composition API computed function with no async action
            filename: 'test.vue',
            code: `
<script setup lang="ts">
import { computed, ref } from 'vue';
const items = ref<number[]>([3, 1, 2]);
const sortedItems = computed(() => {
  return [...items.value].sort((a, b) => a - b);
});
</script>
`,
          },
        ],
        invalid: [
          {
            // TypeScript: Options API await operator (unexpectedInProperty)
            filename: 'test.vue',
            code: `
<script lang="ts">
export default {
  computed: {
    async data(): Promise<number> {
      await fetchData();
      return this.value;
    }
  }
}
</script>
`,
            errors: [
              {
                message:
                  'Move this async function declaration out of the computed property "data".',
              },
              { message: 'Move this await operator out of the computed property "data".' },
            ],
          },
          {
            // TypeScript: Composition API await operator (unexpectedInFunction)
            filename: 'test.vue',
            code: `
<script setup lang="ts">
import { computed, ref } from 'vue';
const value = ref<number>(0);
const data = computed(async (): Promise<number> => {
  await fetchData();
  return value.value;
});
</script>
`,
            errors: [
              { message: 'Move this async function declaration out of the computed function.' },
              { message: 'Move this await operator out of the computed function.' },
            ],
          },
          {
            // TypeScript: Composition API Promise chain (unexpectedInFunction)
            filename: 'test.vue',
            code: `
<script setup lang="ts">
import { computed, ref } from 'vue';
const value = ref<number>(0);
const data = computed(() => {
  somePromise.then((v: number) => v);
  return value.value;
});
</script>
`,
            errors: [{ message: 'Move this asynchronous action out of the computed function.' }],
          },
          {
            // TypeScript: Composition API timed function (unexpectedInFunction)
            filename: 'test.vue',
            code: `
<script setup lang="ts">
import { computed, ref } from 'vue';
const value = ref<number>(0);
const data = computed(() => {
  setTimeout(() => {}, 100);
  return value.value;
});
</script>
`,
            errors: [{ message: 'Move this timed function out of the computed function.' }],
          },
        ],
      },
    );
  });
});
