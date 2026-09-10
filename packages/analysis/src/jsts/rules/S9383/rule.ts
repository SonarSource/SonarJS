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
// https://sonarsource.github.io/rspec/#/rspec/S9383/javascript

import type { Rule } from 'eslint';
import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';
import { rules as tsEslintRules } from '../external/typescript-eslint/index.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { isRequiredParserServices } from '../helpers/parser-services.js';
import { isAny } from '../helpers/type.js';
import * as meta from './generated-meta.js';

const noFloatingPromisesRule = tsEslintRules['no-floating-promises'];

// messageIds upstream uses when it decided the rejection handler isn't a function
const NON_FUNCTION_HANDLER_MESSAGE_IDS = new Set([
  'floatingUselessRejectionHandler',
  'floatingUselessRejectionHandlerVoid',
]);

// Finds the direct `expr.catch(handler)`/`expr.then(onFulfilled, handler)` argument; handlers
// reached only via optional chaining, `void`, or a ternary/logical/sequence branch are out of
// scope (none of the 4 real-world FPs from the ruling review took those shapes) and still get
// reported as before.
function findRejectionHandler(node: TSESTree.Node): TSESTree.Node | null {
  const expression = node.type === AST_NODE_TYPES.ExpressionStatement ? node.expression : node;
  if (expression.type !== AST_NODE_TYPES.CallExpression) {
    return null;
  }
  const { callee, arguments: args } = expression;
  if (
    callee.type !== AST_NODE_TYPES.MemberExpression ||
    callee.property.type !== AST_NODE_TYPES.Identifier
  ) {
    return null;
  }
  if (callee.property.name === 'catch') {
    return args[0] ?? null;
  }
  if (callee.property.name === 'then') {
    return args[1] ?? null;
  }
  return null;
}

// `any` has no call signatures though it's callable at runtime; upstream closed this
// as working-as-intended (typescript-eslint/typescript-eslint#12848), so fix it here.
function isAnyTypedRejectionHandler(
  context: Rule.RuleContext,
  reportedNode: TSESTree.Node,
): boolean {
  const parserServices = context.sourceCode.parserServices;
  if (!isRequiredParserServices(parserServices)) {
    return false;
  }
  const handler = findRejectionHandler(reportedNode);
  if (!handler) {
    return false;
  }
  const tsNode = parserServices.esTreeNodeToTSNodeMap.get(handler);
  return isAny(parserServices.program.getTypeChecker().getTypeAtLocation(tsNode));
}

const decoratedNoFloatingPromisesRule = interceptReport(
  noFloatingPromisesRule,
  (context, descriptor) => {
    if (
      'node' in descriptor &&
      'messageId' in descriptor &&
      NON_FUNCTION_HANDLER_MESSAGE_IDS.has(descriptor.messageId) &&
      isAnyTypedRejectionHandler(context, descriptor.node as unknown as TSESTree.Node)
    ) {
      return;
    }
    context.report(descriptor);
  },
);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { ...noFloatingPromisesRule.meta }),
  create(context: Rule.RuleContext) {
    return decoratedNoFloatingPromisesRule.create(context);
  },
};
