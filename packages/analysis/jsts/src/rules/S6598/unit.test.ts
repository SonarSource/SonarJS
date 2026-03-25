/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
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
import { rules as tsEslintRules } from '../external/typescript-eslint/index.js';
import { NoTypeCheckingRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';
import vueParser from 'vue-eslint-parser';
import tsParser from '@typescript-eslint/parser';

describe('S6598', () => {
  it('S6598', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    const vueRuleTester = new NoTypeCheckingRuleTester({
      parser: vueParser,
      parserOptions: { parser: tsParser },
    });

    ruleTester.run(`Decorated rule should reword the issue message`, rule, {
      valid: [
        {
          code: `type Foo = () => number;`,
        },
      ],
      invalid: [
        {
          code: `interface Foo { (): number; }`,
          errors: [
            {
              message:
                'Interface has only a call signature, you should use a function type instead.',
            },
          ],
          output: 'type Foo = () => number;',
        },
      ],
    });

    vueRuleTester.run('defineEmits type argument in Vue script setup', rule, {
      valid: [
        {
          // Compliant: named interface as defineEmits type arg
          code: `<script setup lang="ts">
interface ClickEmits {
  (e: 'click'): void;
}
const emit = defineEmits<ClickEmits>();
</script>`,
        },
        {
          // Compliant: inline type literal as defineEmits type arg
          code: `<script setup lang="ts">
const emit = defineEmits<{
  (e: 'submit'): void;
}>();
</script>`,
        },
        {
          // Compliant: named type alias as defineEmits type arg
          code: `<script setup lang="ts">
type ChangeEmits = {
  (e: 'change', value: string): void;
};
const emit = defineEmits<ChangeEmits>();
</script>`,
        },
      ],
      invalid: [
        {
          // Interface unrelated to defineEmits is still flagged
          code: `<script setup lang="ts">
interface MyTransformer {
  (input: string): number;
}
</script>`,
          errors: 1,
          output: `<script setup lang="ts">
type MyTransformer = (input: string) => number;
</script>`,
        },
      ],
    });

    // Sentinel: verify the upstream rule still raises an issue on the defineEmits FP pattern.
    // If this test fails, upstream prefer-function-type no longer flags this pattern natively,
    // and the suppression logic in decorator.ts can be safely removed.
    new NoTypeCheckingRuleTester({
      parser: vueParser,
      parserOptions: { parser: tsParser },
    }).run(
      'upstream prefer-function-type raises issue on defineEmits type arg (sentinel)',
      tsEslintRules['prefer-function-type'],
      {
        valid: [],
        invalid: [
          {
            code: `<script setup lang="ts">
interface ClickEmits {
  (e: 'click'): void;
}
const emit = defineEmits<ClickEmits>();
</script>`,
            errors: 1,
            output: `<script setup lang="ts">
type ClickEmits = (e: 'click') => void;
const emit = defineEmits<ClickEmits>();
</script>`,
          },
        ],
      },
    );
  });
});
