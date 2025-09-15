/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S4818/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta, getFullyQualifiedName } from '../helpers/index.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      safeSocket: 'Make sure that sockets are used safely here.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      NewExpression: (node: estree.Node) =>
        checkCallExpression(node as estree.NewExpression, context, 'net.Socket'),
      CallExpression: (node: estree.Node) =>
        checkCallExpression(
          node as estree.CallExpression,
          context,
          'net.createConnection',
          'net.connect',
        ),
    };
  },
};

function checkCallExpression(
  callExpr: estree.CallExpression,
  context: Rule.RuleContext,
  ...sensitiveFqns: string[]
) {
  const callFqn = getFullyQualifiedName(context, callExpr);
  if (sensitiveFqns.includes(callFqn)) {
    context.report({ messageId: 'safeSocket', node: callExpr.callee });
  }
}
