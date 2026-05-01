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
import { getExternalRuleDefinition } from '../external/registry.js';
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

const upstreamRule = getExternalRuleDefinition('import', 'no-absolute-path')!;

// Sentinel: verify that the upstream ESLint rule still raises on the patterns our decorator fixes.
// If this test starts failing (i.e., the upstream rule no longer reports these patterns),
// it signals that the decorator can be safely removed.
describe('S6859 upstream sentinel', () => {
  it('upstream no-absolute-path raises on symbolic root aliases that decorator suppresses', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('no-absolute-path', upstreamRule, {
      valid: [],
      invalid: [
        { code: `import { useCool } from '/@/cool';`, errors: 1 },
        { code: `import { useDict } from '/$/dict';`, errors: 1 },
        { code: `import { Plugins } from '/#/crud';`, errors: 1 },
      ],
    });
  });
});

describe('S6859', () => {
  it('should not flag exact symbolic root alias first segments', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('no-absolute-path', rule, {
      valid: [
        { code: `import { useCool } from '/@/cool';` },
        { code: `import AppHeader from '/@/components/AppHeader';` },
        { code: `import { useDict } from '/$/dict';` },
        { code: `import { apiClient } from '/$/api/client';` },
        { code: `import { Plugins } from '/#/crud';` },
        { code: `import { setupPlugins } from '/#/plugins';` },
      ],
      invalid: [
        {
          code: `import foo from '/usr/local/lib/foo';`,
          errors: 1,
        },
        {
          code: `import bar from '/home/user/project/bar';`,
          errors: 1,
        },
        {
          code: `import { helper } from '/@utils/date';`,
          errors: 1,
        },
        {
          code: `import { helper } from '/~/utils/date';`,
          errors: 1,
        },
        {
          code: `import foo from '/imports/api/foo';`,
          errors: 1,
        },
        {
          code: `import logo from '/static/images/logo.png';`,
          errors: 1,
        },
      ],
    });
  });
});
