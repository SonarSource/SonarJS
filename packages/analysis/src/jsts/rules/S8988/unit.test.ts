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

describe('S8988', () => {
  it('S8988 (decorated: vue/no-side-effects-in-computed-properties)', () => {
    ruleTesterVue.run('Side effects should not be performed inside computed properties', rule, {
      valid: [
        {
          // Options API computed property with no side effects
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
          // Composition API computed function with no side effects
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
          // Options API: property assignment (unexpectedSideEffectInProperty)
          code: `
<script>
export default {
  data() {
    return { items: [], discount: 0 };
  },
  computed: {
    totalPrice() {
      this.discount = this.items.length > 5 ? 10 : 0;
      return this.items.reduce((sum, item) => sum + item.price, 0);
    }
  }
}
</script>
`,
          errors: [{ message: 'Remove this side effect from the computed property.' }],
        },
        {
          // Options API: array push mutation (unexpectedSideEffectInProperty)
          code: `
<script>
export default {
  data() {
    return { log: [], value: 0 };
  },
  computed: {
    doubled() {
      this.log.push(this.value);
      return this.value * 2;
    }
  }
}
</script>
`,
          errors: [{ message: 'Remove this side effect from the computed property.' }],
        },
        {
          // Composition API: in-place array sort mutation (unexpectedSideEffectInFunction)
          code: `
<script setup>
import { computed, ref } from 'vue';
const items = ref([{ price: 3 }, { price: 1 }, { price: 2 }]);
const sortedItems = computed(() => {
  return items.value.sort((a, b) => a.price - b.price);
});
</script>
`,
          errors: [{ message: 'Remove this side effect from the computed function.' }],
        },
        {
          // Composition API: array splice mutation (unexpectedSideEffectInFunction)
          code: `
<script setup>
import { computed, ref } from 'vue';
const items = ref([1, 2, 3]);
const firstTwo = computed(() => {
  items.value.splice(2);
  return items.value;
});
</script>
`,
          errors: [{ message: 'Remove this side effect from the computed function.' }],
        },
      ],
    });

    ruleTesterVueTs.run('Side effects should not be performed inside computed properties', rule, {
      valid: [
        {
          // TypeScript: Composition API computed function with non-mutating spread copy
          filename: 'test.vue',
          code: `
<script setup lang="ts">
import { computed, ref } from 'vue';
interface Item { price: number }
const items = ref<Item[]>([{ price: 3 }, { price: 1 }]);
const sortedItems = computed(() => {
  return [...items.value].sort((a, b) => a.price - b.price);
});
</script>
`,
        },
      ],
      invalid: [
        {
          // TypeScript: Options API property mutation in computed (unexpectedSideEffectInProperty)
          filename: 'test.vue',
          code: `
<script lang="ts">
export default {
  data() {
    return { items: [], discount: 0 };
  },
  computed: {
    totalPrice() {
      this.discount = this.items.length > 5 ? 10 : 0;
      return this.items.reduce((sum: number, item: { price: number }) => sum + item.price, 0);
    }
  }
}
</script>
`,
          errors: [{ message: 'Remove this side effect from the computed property.' }],
        },
        {
          // TypeScript: in-place sort on typed reactive ref (unexpectedSideEffectInFunction)
          filename: 'test.vue',
          code: `
<script setup lang="ts">
import { computed, ref } from 'vue';
interface Item { price: number }
const items = ref<Item[]>([{ price: 3 }, { price: 1 }, { price: 2 }]);
const sortedItems = computed(() => {
  return items.value.sort((a, b) => a.price - b.price);
});
</script>
`,
          errors: [{ message: 'Remove this side effect from the computed function.' }],
        },
        {
          // TypeScript: Options API with typed data property assignment (unexpectedSideEffectInProperty)
          filename: 'test.vue',
          code: `
<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({
  data(): { count: number; cached: number } {
    return { count: 0, cached: 0 };
  },
  computed: {
    doubled(): number {
      this.cached = this.count * 2;
      return this.cached;
    }
  }
});
</script>
`,
          errors: [{ message: 'Remove this side effect from the computed property.' }],
        },
      ],
    });
  });
});
