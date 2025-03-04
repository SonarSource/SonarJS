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
// https://sonarsource.github.io/rspec/#/rspec/S3782/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta, getTypeFromTreeNode, isRequiredParserServices } from '../helpers/index.js';
import type { TSESTree } from '@typescript-eslint/utils';
import ts from 'typescript';
import * as meta from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    const tc = services.program.getTypeChecker();

    function isBuiltInMethod(symbol: ts.Symbol) {
      const parent = symbol.valueDeclaration?.parent;
      if (!parent || parent.kind !== ts.SyntaxKind.InterfaceDeclaration) {
        return false;
      }
      const parentSymbol = tc.getSymbolAtLocation((parent as ts.InterfaceDeclaration).name);
      if (!parentSymbol) {
        return false;
      }
      const fqn = tc.getFullyQualifiedName(parentSymbol);
      // some of the built-in objects are deliberately excluded, because they generate many FPs
      // and no relevant TP, e.g. RegExp, Function
      return ['String', 'Math', 'Array', 'Number', 'Date'].includes(fqn);
    }

    function isVarArg(param: ts.ParameterDeclaration) {
      return !!param.dotDotDotToken;
    }

    function isTypeParameter(type: ts.Type) {
      return type.getFlags() & ts.TypeFlags.TypeParameter;
    }

    function declarationMismatch(
      declaration: ts.SignatureDeclaration,
      callExpression: estree.CallExpression,
    ) {
      const parameters = declaration.parameters;
      for (let i = 0; i < Math.min(parameters.length, callExpression.arguments.length); i++) {
        const parameterType = parameters[i].type;
        if (!parameterType) {
          return null;
        }
        const declaredType = tc.getTypeFromTypeNode(parameterType);
        const actualType = getTypeFromTreeNode(callExpression.arguments[i], services);
        if (
          // @ts-ignore private API, see https://github.com/microsoft/TypeScript/issues/9879
          !tc.isTypeAssignableTo(actualType, declaredType) &&
          !isTypeParameter(declaredType) &&
          !ts.isFunctionTypeNode(parameterType) &&
          !isVarArg(parameters[i])
        ) {
          return { actualType, declaredType, node: callExpression.arguments[i] };
        }
      }
      return null;
    }

    function typeToString(type: ts.Type) {
      return tc.typeToString(tc.getBaseTypeOfLiteralType(type));
    }

    return {
      CallExpression: (node: estree.Node) => {
        const callExpression = node as estree.CallExpression;
        const tsCallExpr = services.esTreeNodeToTSNodeMap.get(
          callExpression.callee as TSESTree.Node,
        );
        const symbol = tc.getSymbolAtLocation(tsCallExpr);

        if (symbol?.declarations && isBuiltInMethod(symbol)) {
          let mismatch: {
            actualType: ts.Type;
            declaredType: ts.Type;
            node: estree.Node;
          } | null = null;
          for (const declaration of symbol.declarations) {
            mismatch = declarationMismatch(declaration as ts.SignatureDeclaration, callExpression);
            if (!mismatch) {
              return;
            }
          }
          if (mismatch) {
            context.report({
              node: mismatch.node,
              message: `Verify that argument is of correct type: expected '${typeToString(
                mismatch.declaredType,
              )}' instead of '${typeToString(mismatch.actualType)}'.`,
            });
          }
        }
      },
    };
  },
};
