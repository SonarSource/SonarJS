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
// https://sonarsource.github.io/rspec/#/rspec/S8980/javascript
import { test } from '../../../../tests/jsts/tools/testers/comment-based/checker.js';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rules as testingLibraryRules } from '../external/testing-library.js';
import { rule } from './index.js';
import { describe } from 'node:test';
import * as meta from './generated-meta.js';

const upstreamRule = testingLibraryRules['no-unnecessary-act'];

// Sentinel: upstream treats a conditional hook action as no non-Testing-Library call.
describe('S8980 upstream sentinel', () => {
  const ruleTester = new NoTypeCheckingRuleTester();
  ruleTester.run('no-unnecessary-act', upstreamRule, {
    valid: [],
    invalid: [
      {
        code: `
          import { act, renderHook } from '@testing-library/react';
          declare const id: string | undefined;
          const { result } = renderHook(() => ({ dismiss: (_id: string) => {} }));

          act(() => {
            if (id) result.current.dismiss(id);
          });
        `,
        options: [{ isStrict: false }],
        errors: [{ messageId: 'noUnnecessaryActTestingLibraryUtil' }],
      },
    ],
  });
});

describe(`Rule S8980`, () => {
  test(meta, rule, import.meta.dirname);
});
