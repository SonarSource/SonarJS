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

describe('S9128', () => {
  it('S9128 (decorated: vue/no-dupe-keys)', () => {
    ruleTesterVue.run('Vue component field names should not be duplicated', rule, {
      valid: [
        {
          // Options API: props/data/computed/methods/setup all use distinct names
          code: `
<script>
export default {
  props: {
    title: String
  },
  data() {
    return { count: 0 };
  },
  computed: {
    doubled() {
      return this.count * 2;
    }
  },
  methods: {
    increment() {
      this.count++;
    }
  }
}
</script>
`,
        },
        {
          // Composition API: defineProps prop with no colliding script-setup binding
          code: `
<script setup>
const props = defineProps(['title']);
const count = ref(0);
</script>
`,
        },
        {
          // Composition API: withDefaults(defineProps(...)) prop with no colliding binding
          code: `
<script setup>
const props = withDefaults(defineProps(['title']), { title: 'default' });
const displayTitle = ref('');
</script>
`,
        },
        {
          // Composition API: reactive props destructuring binds a local variable with the
          // same name as the prop itself - this is not a collision, just accessing the prop
          code: `
<script setup>
const { name } = defineProps(['name']);
</script>
`,
        },
        {
          // Composition API: prop renamed during destructuring, so the unrelated local
          // variable sharing the prop's original name isn't actually shadowing the prop
          code: `
<script setup>
const { name: userName } = defineProps(['name']);
const name = ref('unrelated');
</script>
`,
        },
      ],
      invalid: [
        {
          // Options API: a prop name reused in both data and methods (both occurrences flagged)
          code: `
<script>
export default {
  props: {
    name: String
  },
  data() {
    return {
      name: null
    };
  },
  methods: {
    name() {}
  }
}
</script>
`,
          errors: [{ message: "Duplicate key 'name'." }, { message: "Duplicate key 'name'." }],
        },
        {
          // Composition API: defineProps() prop colliding with another script-setup binding
          code: `
<script setup>
const props = defineProps(['name']);

const name = ref('');
</script>
`,
          errors: [{ message: "Duplicate key 'name'." }],
        },
        {
          // Composition API: withDefaults(defineProps(...), ...) prop colliding with another binding
          code: `
<script setup>
const props = withDefaults(defineProps(['name']), { name: 'default' });
const name = ref('');
</script>
`,
          errors: [{ message: "Duplicate key 'name'." }],
        },
        {
          // Options API: a prop name reused in a computed property
          code: `
<script>
export default {
  props: {
    name: String
  },
  computed: {
    name() {
      return this.name;
    }
  }
}
</script>
`,
          errors: [{ message: "Duplicate key 'name'." }],
        },
        {
          // Options API: a prop name reused in the return value of setup()
          code: `
<script>
export default {
  props: {
    name: String
  },
  setup() {
    return {
      name: 'value'
    };
  }
}
</script>
`,
          errors: [{ message: "Duplicate key 'name'." }],
        },
        {
          // Composition API: object-style defineProps() prop colliding with another binding
          code: `
<script setup>
const props = defineProps({ name: String });
const name = ref('');
</script>
`,
          errors: [{ message: "Duplicate key 'name'." }],
        },
        {
          // Options API: two independent collisions in the same component are both reported
          code: `
<script>
export default {
  props: {
    name: String,
    id: Number
  },
  data() {
    return {
      name: null,
      id: null
    };
  }
}
</script>
`,
          errors: [{ message: "Duplicate key 'name'." }, { message: "Duplicate key 'id'." }],
        },
      ],
    });

    ruleTesterVueTs.run('Vue component field names should not be duplicated', rule, {
      valid: [
        {
          // TypeScript: Composition API withDefaults(defineProps<...>()) with no colliding binding
          filename: 'test.vue',
          code: `
<script setup lang="ts">
interface Props {
  title?: string;
}
const props = withDefaults(defineProps<Props>(), { title: 'default' });
const displayTitle = ref('');
</script>
`,
        },
      ],
      invalid: [
        {
          // TypeScript: Options API prop colliding with a method
          filename: 'test.vue',
          code: `
<script lang="ts">
export default {
  props: {
    name: String
  },
  methods: {
    name() {}
  }
}
</script>
`,
          errors: [{ message: "Duplicate key 'name'." }],
        },
        {
          // TypeScript: Composition API withDefaults(defineProps<...>()) prop colliding with another binding
          filename: 'test.vue',
          code: `
<script setup lang="ts">
interface Props {
  name?: string;
}
const props = withDefaults(defineProps<Props>(), { name: 'default' });
const name = ref('');
</script>
`,
          errors: [{ message: "Duplicate key 'name'." }],
        },
        {
          // TypeScript: plain defineProps<...>() (no withDefaults) prop colliding with another binding
          filename: 'test.vue',
          code: `
<script setup lang="ts">
interface Props {
  name?: string;
}
const props = defineProps<Props>();
const name = ref('');
</script>
`,
          errors: [{ message: "Duplicate key 'name'." }],
        },
      ],
    });
  });
});
