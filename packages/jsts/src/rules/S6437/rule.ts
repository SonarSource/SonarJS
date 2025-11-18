/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
// https://sonarsource.github.io/rspec/#/rspec/S2077/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta, getFullyQualifiedName } from '../helpers/index.js';
import * as meta from './generated-meta.js';

// Dictionary with fully qualified names of functions and indices of their
// parameters to analyze for hardcoded credentials.
const secretSignatures: Record<string, [number]> = {
  'cookie-parser': [0],
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      secretSignature: `Revoke and change this password, as it is compromised.`,
    },
  }),

  create(context: Rule.RuleContext) {
    return {
      CallExpression: (node: estree.Node) => {
        const callExpression = node as estree.CallExpression;
        const fqn = getFullyQualifiedName(context, callExpression);

        if (
          fqn &&
          secretSignatures.has(fqn) &&
          secretSignatures[fqn].every(index => containsHardcodedCredentials(callExpression, index))
        ) {
          context.report({
            messageId: 'reviewDynamicTemplate',
            node: callExpression.callee,
          });
        }
      },
    };
  },
};

function containsHardcodedCredentials(node: estree.CallExpression, index = 0): boolean {
  const args = node.arguments;
  const templateString = args[index] as estree.Expression | estree.SpreadElement | undefined;

  if (!templateString) {
    return false;
  }

  return (
    node.type === 'Literal' || (node.type === 'TemplateLiteral' && node.expressions.length === 0)
  );
}
