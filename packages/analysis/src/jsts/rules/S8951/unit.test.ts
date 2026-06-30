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

describe('S8951', () => {
  it('S8951 (external: vue/no-mutating-props)', () => {
    ruleTesterVue.run('Vue component props should not be mutated', rule, {
      valid: [
        {
          // emitting instead of mutating
          code: `
      <script>
        export default {
          props: ['foo'],
          methods: {
            update() { this.$emit('update:foo', 'bar'); }
          }
        };
      </script>
      `,
        },
        {
          // local copy mutation
          code: `
      <script>
        export default {
          props: ['items'],
          methods: {
            add(item) { const copy = [...this.items]; copy.push(item); }
          }
        };
      </script>
      `,
        },
        {
          // shallowOnly: true allows nested mutation
          code: `
      <script>
        export default {
          props: ['foo'],
          methods: {
            update() { this.foo.push('bar'); }
          }
        };
      </script>
      `,
          options: [{ shallowOnly: true }],
        },
        {
          // <script setup> - no mutation
          code: `
      <script setup>
        const props = defineProps(['foo']);
      </script>
      `,
        },
      ],
      invalid: [
        {
          // Options API - direct prop assignment
          code: `
      <script>
        export default {
          props: ['foo'],
          methods: {
            update() { this.foo = 'bar'; }
          }
        };
      </script>
      `,
          errors: 1,
        },
        {
          // Options API - nested prop mutation
          code: `
      <script>
        export default {
          props: ['items'],
          methods: {
            add(item) { this.items.push(item); }
          }
        };
      </script>
      `,
          errors: 1,
        },
        {
          // <script setup> with defineProps - direct assignment
          code: `
      <script setup>
        const props = defineProps(['foo']);
        props.foo = 'bar';
      </script>
      `,
          errors: 1,
        },
        {
          // shallowOnly: true still flags direct reassignment
          code: `
      <script>
        export default {
          props: ['foo'],
          methods: {
            update() { this.foo = 'bar'; }
          }
        };
      </script>
      `,
          options: [{ shallowOnly: true }],
          errors: 1,
        },
      ],
    });
  });
});
