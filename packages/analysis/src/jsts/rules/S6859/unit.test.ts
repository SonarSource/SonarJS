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
import { decorate } from './decorator.js';
import { getExternalRuleDefinition } from '../external/registry.js';
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';
import type { Rule } from 'eslint';

const upstreamRule = getExternalRuleDefinition('import', 'no-absolute-path')!;
const filename = '/home/user/project/index.js';
const mockUpstreamMeta: Rule.RuleMetaData = { type: 'suggestion', fixable: 'code', messages: {} };

// Sentinel: verify that the upstream ESLint rule still raises on the patterns our decorator fixes.
// If this test starts failing (i.e., the upstream rule no longer reports these patterns),
// it signals that the decorator can be safely removed.
describe('S6859 upstream sentinel', () => {
  it('upstream no-absolute-path raises on symbolic root aliases that decorator suppresses', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('no-absolute-path', upstreamRule, {
      valid: [],
      invalid: [
        {
          code: `import { useCool } from '/@/cool';`,
          filename,
          errors: 1,
          output: `import { useCool } from "../../../@/cool";`,
        },
        {
          code: `import { useDict } from '/$/dict';`,
          filename,
          errors: 1,
          output: `import { useDict } from "../../../$/dict";`,
        },
        {
          code: `import { Plugins } from '/#/crud';`,
          filename,
          errors: 1,
          output: `import { Plugins } from "../../../#/crud";`,
        },
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
          filename,
          errors: 1,
          output: `import foo from "../../../usr/local/lib/foo";`,
        },
        {
          code: `import bar from '/home/user/project/bar';`,
          filename,
          errors: 1,
          output: `import bar from "./bar";`,
        },
        {
          code: `import { helper } from '/@utils/date';`,
          filename,
          errors: 1,
          output: `import { helper } from "../../../@utils/date";`,
        },
        {
          code: `import foo from '/@';`,
          filename,
          errors: 1,
          output: `import foo from "../../../@";`,
        },
        {
          code: `import { helper } from '/~/utils/date';`,
          filename,
          errors: 1,
          output: `import { helper } from "../../../~/utils/date";`,
        },
        {
          code: `import foo from '/imports/api/foo';`,
          filename,
          errors: 1,
          output: `import foo from "../../../imports/api/foo";`,
        },
        {
          code: `import logo from '/static/images/logo.png';`,
          filename,
          errors: 1,
          output: `import logo from "../../../static/images/logo.png";`,
        },
      ],
    });
  });
});

describe('S6859 decorator edge cases', () => {
  it('should pass through a report descriptor without a node', () => {
    const mockUpstream: Rule.RuleModule = {
      meta: mockUpstreamMeta,
      create(context) {
        return {
          Program(node) {
            (context as any).report({ loc: node.loc!, message: 'no-node descriptor forwarded' });
          },
        };
      },
    };

    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('no-node descriptor', decorate(mockUpstream), {
      valid: [],
      invalid: [
        {
          code: `const x = 1;`,
          errors: [{ message: 'no-node descriptor forwarded' }],
        },
      ],
    });
  });

  it('should pass through a report descriptor whose node is not a literal', () => {
    const mockUpstream: Rule.RuleModule = {
      meta: mockUpstreamMeta,
      create(context) {
        return {
          Program(node) {
            context.report({ node, message: 'non-literal node forwarded' });
          },
        };
      },
    };

    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('non-literal node', decorate(mockUpstream), {
      valid: [],
      invalid: [
        {
          code: `const x = 1;`,
          errors: [{ message: 'non-literal node forwarded' }],
        },
      ],
    });
  });

  it('should pass through one-segment absolute paths', () => {
    const mockUpstream: Rule.RuleModule = {
      meta: mockUpstreamMeta,
      create(context) {
        return {
          Literal(node) {
            context.report({ node, message: 'one-segment path forwarded' });
          },
        };
      },
    };

    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('one-segment absolute path', decorate(mockUpstream), {
      valid: [
        {
          code: `import foo from '/@/foo';`,
        },
      ],
      invalid: [
        {
          code: `import foo from '/@';`,
          errors: [{ message: 'one-segment path forwarded' }],
        },
      ],
    });
  });
});
