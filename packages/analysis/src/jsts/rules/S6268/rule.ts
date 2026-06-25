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
// https://sonarsource.github.io/rspec/#/rspec/S6268/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import {
  getProperty,
  getUniqueWriteUsageOrNode,
  getValueOfExpression,
  isLiteral,
  isMemberWithProperty,
} from '../helpers/ast.js';
import * as meta from './generated-meta.js';

const bypassMethods = [
  'bypassSecurityTrustHtml',
  'bypassSecurityTrustStyle',
  'bypassSecurityTrustScript',
  'bypassSecurityTrustUrl',
  'bypassSecurityTrustResourceUrl',
];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      checkAngularBypass: 'Make sure disabling Angular built-in sanitization is safe here.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      CallExpression: (node: estree.Node) => {
        const { callee, arguments: args } = node as estree.CallExpression;

        if (
          isMemberWithProperty(callee, ...bypassMethods) &&
          args.length === 1 &&
          !isHardcodedLiteral(args[0], context)
        ) {
          context.report({
            messageId: 'checkAngularBypass',
            node: (callee as estree.MemberExpression).property,
          });
        }
      },
    };
  },
};

function isHardcodedLiteral(
  node: estree.Node,
  context: Rule.RuleContext,
  visited: Set<estree.Node> = new Set(),
): boolean {
  if (visited.has(node)) {
    return false;
  }
  visited.add(node);
  if (node.type === 'TemplateLiteral') {
    return node.expressions.length === 0;
  }
  if (isLiteral(node)) {
    return true;
  }
  // Identifier with a single write site: trace to the assigned value
  if (node.type === 'Identifier') {
    const resolved = getUniqueWriteUsageOrNode(context, node, true);
    if (resolved !== node) {
      return isHardcodedLiteral(resolved, context, visited);
    }
  }
  // obj.prop where obj resolves to an object literal with a literal property value
  if (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier') {
    const obj = getValueOfExpression(context, node.object, 'ObjectExpression', true);
    if (obj) {
      const prop = getProperty(obj, node.property.name, context);
      if (prop) {
        return isHardcodedLiteral(prop.value as estree.Node, context, visited);
      }
    }
  }
  return false;
}
