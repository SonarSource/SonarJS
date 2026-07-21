/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute this program and/or modify it under the terms of
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
// https://sonarsource.github.io/rspec/#/rspec/S9073/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { extractTestAssertion } from '../helpers/assertions.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

const messages = {
  issue:
    'This composite assertion hides which condition failed; split it to make failures actionable.',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    return {
      CallExpression(node: estree.Node) {
        const assertion = extractTestAssertion(context, node);
        if (
          !assertion ||
          assertion.kind !== 'predicate' ||
          (assertion.style !== 'node-assert' && assertion.style !== 'jest-like') ||
          (assertion.predicate !== 'truthy' && assertion.predicate !== 'falsy')
        ) {
          return;
        }

        const isTruthy = (assertion.predicate === 'truthy') !== assertion.negated;
        const actual = assertion.actual;
        const isComposite =
          (isTruthy &&
            ((actual.type === 'LogicalExpression' && actual.operator === '&&') ||
              (actual.type === 'UnaryExpression' &&
                actual.operator === '!' &&
                actual.argument.type === 'LogicalExpression' &&
                actual.argument.operator === '||'))) ||
          (!isTruthy && actual.type === 'LogicalExpression' && actual.operator === '||');

        if (isComposite) {
          context.report({ node: actual, messageId: 'issue' });
        }
      },
    };
  },
};
