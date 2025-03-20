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
// https://sonarsource.github.io/rspec/#/rspec/S3001/javascript

import { Rule, Scope } from 'eslint';
import estree from 'estree';
import { generateMeta } from '../helpers/index.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      removeDelete: 'Remove this "delete" operator or pass an object property to it.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      "UnaryExpression[operator='delete'][argument.type!='MemberExpression'][argument.type!='ChainExpression']":
        (node: estree.Node) => {
          const { argument } = node as estree.UnaryExpression;
          if (!isGlobalProperty(argument, context.sourceCode.getScope(node).references)) {
            context.report({
              messageId: 'removeDelete',
              node,
            });
          }
        },
    };
  },
};

function isGlobalProperty(expr: estree.Expression, references: Scope.Reference[]) {
  return (
    expr.type === 'Identifier' &&
    references.filter(ref => ref.identifier.name === expr.name && ref.resolved).length === 0
  );
}
