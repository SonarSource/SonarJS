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
import { decorate } from './decorator.js';
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';
import type { Rule } from 'eslint';

/** Upstream always reports a node; this covers the descriptor shape it never produces. */
const locOnlyRule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Reports a location without a node' },
    fixable: 'code',
    schema: [],
  },
  create(context) {
    return {
      BinaryExpression(node) {
        context.report({ loc: node.loc!, message: 'reported without a node' });
      },
    };
  },
};

describe('S7767 decorator', () => {
  it('forwards descriptors that carry no node', () => {
    new DefaultParserRuleTester().run('prefer-math-trunc', decorate(locOnlyRule), {
      valid: [],
      invalid: [
        {
          code: `value << 0;`,
          errors: [{ message: 'reported without a node' }],
        },
      ],
    });
  });
});
