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

describe('S9145 on Vue 2.7', () => {
  const dirname = join(import.meta.dirname, 'fixtures');
  process.chdir(dirname);
  const ruleTester = new NoTypeCheckingRuleTester();
  ruleTester.run(
    'S9145 is silenced on Vue 2.7: it backported the Composition API, but Vue 2 users are not ' +
      'moving off the Options API just because it became available, so the Composition API is ' +
      'only considered available from Vue 3 onward',
    rule,
    {
      valid: [
        {
          code: `
            import { Vue } from 'vue-class-component';
            export default class MyComponent extends Vue {
              count = 0;
            }
          `,
          filename: join(dirname, 'component.ts'),
        },
      ],
      invalid: [],
    },
  );
});
