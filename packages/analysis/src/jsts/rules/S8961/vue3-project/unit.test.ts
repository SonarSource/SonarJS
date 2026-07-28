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
import { rule } from '../index.js';
import { join } from 'node:path/posix';
import { NoTypeCheckingRuleTester } from '../../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe } from 'node:test';
import parser from 'vue-eslint-parser';

describe('S8961 on Vue 3', () => {
  const dirname = join(import.meta.dirname, 'fixtures');
  process.chdir(dirname);
  const ruleTester = new NoTypeCheckingRuleTester({ parser });
  ruleTester.run('S8961 still reports missing emits declarations on Vue 3 projects', rule, {
    valid: [
      {
        code: `<script>export default { emits: ['leadFormSent'], methods: { submit() { this.$emit('leadFormSent'); } } };</script>`,
        filename: join(dirname, 'component.tsx'),
      },
    ],
    invalid: [
      {
        code: `<script>export default { methods: { submit() { this.$emit('leadFormSent'); } } };</script>`,
        filename: join(dirname, 'component.tsx'),
        errors: 1,
      },
    ],
  });
});
