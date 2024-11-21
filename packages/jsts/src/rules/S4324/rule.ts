/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S4324/javascript

import type { Rule } from 'eslint';
import { TSESTree } from '@typescript-eslint/utils';
import {
  generateMeta,
  isRequiredParserServices,
  RequiredParserServices,
} from '../helpers/index.js';
import estree from 'estree';
import ts from 'typescript';
import { meta } from './meta.js';

type ReturnedExpression = estree.Expression | undefined | null;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      removeOrChangeType: 'Remove this return type or change it to a more specific.',
    },
  }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;

    if (isRequiredParserServices(services)) {
      const returnedExpressions: ReturnedExpression[][] = [];
      return {
        ReturnStatement(node: estree.Node) {
          if (returnedExpressions.length > 0) {
            returnedExpressions[returnedExpressions.length - 1].push(
              (node as estree.ReturnStatement).argument,
            );
          }
        },
        FunctionDeclaration() {
          returnedExpressions.push([]);
        },
        'FunctionDeclaration:exit'(node: estree.Node) {
          const returnType = (node as TSESTree.FunctionDeclaration).returnType;
          if (
            returnType &&
            returnType.typeAnnotation.type === 'TSAnyKeyword' &&
            returnedExpressions.length > 0 &&
            allReturnTypesEqual(returnedExpressions[returnedExpressions.length - 1], services)
          ) {
            context.report({
              messageId: 'removeOrChangeType',
              loc: returnType.loc,
            });
          }
          returnedExpressions.pop();
        },
      };
    }
    return {};
  },
};

function allReturnTypesEqual(
  returns: ReturnedExpression[],
  services: RequiredParserServices,
): boolean {
  const firstReturnType = getTypeFromTreeNode(returns.pop(), services);
  if (!!firstReturnType && !!isPrimitiveType(firstReturnType)) {
    return returns.every(nextReturn => {
      const nextReturnType = getTypeFromTreeNode(nextReturn, services);
      return !!nextReturnType && nextReturnType.flags === firstReturnType.flags;
    });
  }
  return false;
}

function getTypeFromTreeNode(node: ReturnedExpression, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  return checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node));
}

function isPrimitiveType({ flags }: ts.Type) {
  return (
    flags & ts.TypeFlags.BooleanLike ||
    flags & ts.TypeFlags.NumberLike ||
    flags & ts.TypeFlags.StringLike ||
    flags & ts.TypeFlags.EnumLike
  );
}
