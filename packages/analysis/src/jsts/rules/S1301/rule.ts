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
// https://sonarsource.github.io/rspec/#/rspec/S1301

import type { Rule } from 'eslint';
import type estree from 'estree';
import type { TSESTree, ParserServices } from '@typescript-eslint/utils';
import ts from 'typescript';
import { generateMeta } from '../helpers/generate-meta.js';
import {
  isRequiredParserServices,
  type RequiredParserServices,
} from '../helpers/parser-services.js';
import { getTypeFromTreeNode } from '../helpers/type.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      replaceSwitch: 'Replace this "switch" statement by "if" statements to increase readability.',
    },
  }),
  create(context) {
    const services = context.sourceCode.parserServices;
    return {
      SwitchStatement(node: estree.SwitchStatement) {
        const { cases } = node;
        const hasDefault = cases.some(x => !x.test);
        if (cases.length < 2 || (cases.length === 2 && hasDefault)) {
          if (
            hasDefault &&
            // Safe: @typescript-eslint/parser provides TSESTree nodes at runtime; ESLint types
            // visitors with estree.SwitchStatement, but the actual object is TSESTree.SwitchStatement.
            isExhaustivenessCheck(node as unknown as TSESTree.SwitchStatement, services)
          ) {
            return;
          }
          const firstToken = context.sourceCode.getFirstToken(node);
          if (firstToken) {
            context.report({
              messageId: 'replaceSwitch',
              loc: firstToken.loc,
            });
          }
        }
      },
    };
  },
};

/**
 * Returns true if the default case contains a TypeScript exhaustiveness pattern:
 * - A variable declaration typed as `never` where the init is the switch discriminant
 *   (e.g., `const _exhaustiveCheck: never = x` where `x` is the discriminant)
 * - A call expression whose argument is the switch discriminant narrowed to `never` by TypeScript
 *   (e.g., `assertNever(x)` where `x` is the discriminant narrowed to `never`)
 *
 * Both checks require the `never`-typed value to be the switch discriminant itself, not an
 * unrelated `never`-returning expression (e.g., `fail()`).
 */
function isExhaustivenessCheck(
  node: TSESTree.SwitchStatement,
  services: ParserServices | undefined,
): boolean {
  const defaultCase = node.cases.find(c => c.test === null);
  if (!defaultCase) {
    return false;
  }
  const discriminant = node.discriminant;
  for (const stmt of defaultCase.consequent) {
    if (hasNeverTypeAnnotation(stmt, discriminant)) {
      return true;
    }
    if (isRequiredParserServices(services) && hasNeverTypedCallArg(stmt, discriminant, services)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if a statement is `const _: never = <discriminant>`.
 * The init must syntactically match the switch discriminant to rule out patterns like
 * `const _: never = fail()` where `fail()` returns `never` but is unrelated to the discriminant.
 */
function hasNeverTypeAnnotation(
  stmt: TSESTree.Statement,
  discriminant: TSESTree.Expression,
): boolean {
  if (stmt.type !== 'VariableDeclaration') {
    return false;
  }
  return stmt.declarations.some(d => {
    if (d.type !== 'VariableDeclarator' || d.id.type !== 'Identifier') {
      return false;
    }
    if (d.id.typeAnnotation?.typeAnnotation.type !== 'TSNeverKeyword') {
      return false;
    }
    // The init must be the switch discriminant itself, not any other never-typed expression.
    return d.init != null && isSameExpression(d.init, discriminant);
  });
}

/**
 * Checks if a statement contains an exhaustiveness-sentinel call with the switch discriminant as argument.
 * All three conditions must hold:
 * - The call itself must return `never`, identifying it as a sentinel (e.g., `assertNever`).
 *   Plain helpers like `logValue(status)` or `console.log(status)` accept a `never`-typed
 *   argument only because `never` is assignable to every type — they are not sentinels.
 * - One argument must syntactically match the discriminant, narrowed to `never` by TypeScript's
 *   control flow, ruling out patterns like `assertNever(fail())` where `fail()` returns `never`
 *   but is not the discriminant.
 * - The parameter type at the matching argument position must itself be `never`. This rules out
 *   helpers like `failWith(x: unknown): never` where the parameter accepts any value — only an
 *   explicit `(x: never): never` signature proves the call is an exhaustiveness sentinel.
 */
function hasNeverTypedCallArg(
  stmt: TSESTree.Statement,
  discriminant: TSESTree.Expression,
  services: RequiredParserServices,
): boolean {
  let callExpr: TSESTree.CallExpression | null = null;
  if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'CallExpression') {
    callExpr = stmt.expression;
  } else if (stmt.type === 'ReturnStatement' && stmt.argument?.type === 'CallExpression') {
    callExpr = stmt.argument;
  } else if (stmt.type === 'ThrowStatement' && stmt.argument?.type === 'CallExpression') {
    callExpr = stmt.argument;
  }
  if (!callExpr) {
    return false;
  }
  // The call itself must return `never` to qualify as an exhaustiveness sentinel.
  // Safe: TSESTree and estree describe the same runtime AST objects; the double cast is required
  // because TypeScript cannot directly cast between the two library declarations.
  const callType = getTypeFromTreeNode(callExpr as unknown as estree.Node, services);
  if ((callType.flags & ts.TypeFlags.Never) === 0) {
    return false;
  }
  const checker = services.program.getTypeChecker();
  const tsCallNode = services.esTreeNodeToTSNodeMap.get(callExpr) as ts.CallLikeExpression;
  const signature = checker.getResolvedSignature(tsCallNode);
  return callExpr.arguments.some((arg, index) => {
    // The argument must be the switch discriminant, narrowed to `never` by TypeScript's control flow.
    if (!isSameExpression(arg, discriminant)) {
      return false;
    }
    const argType = getTypeFromTreeNode(arg as unknown as estree.Node, services);
    if ((argType.flags & ts.TypeFlags.Never) === 0) {
      return false;
    }
    // The declared parameter type must be `never`. This distinguishes an explicit exhaustiveness
    // sentinel like `assertNever(x: never)` from a helper that merely accepts `never` because
    // `never` is assignable to every type (e.g., `failWith(x: unknown)`).
    if (!signature) {
      return false;
    }
    const params = signature.getParameters();
    const param = params[index];
    if (!param) {
      return false;
    }
    const paramType = checker.getTypeOfSymbol(param);
    return (paramType.flags & ts.TypeFlags.Never) !== 0;
  });
}

/**
 * Returns true if two expressions refer to the same simple identifier or member expression.
 * Handles `x` (Identifier) and `obj.prop` (non-computed MemberExpression).
 */
function isSameExpression(a: TSESTree.Node, b: TSESTree.Node): boolean {
  if (a.type === 'Identifier' && b.type === 'Identifier') {
    return a.name === b.name;
  }
  if (a.type === 'MemberExpression' && b.type === 'MemberExpression') {
    return (
      !a.computed &&
      !b.computed &&
      a.property.type === 'Identifier' &&
      b.property.type === 'Identifier' &&
      a.property.name === b.property.name &&
      isSameExpression(a.object, b.object)
    );
  }
  return false;
}
