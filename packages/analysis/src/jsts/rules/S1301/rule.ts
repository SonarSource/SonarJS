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
 * - A variable declaration typed as `never` (e.g., `const _exhaustiveCheck: never = x`)
 * - A call expression whose argument is narrowed to `never` by TypeScript (e.g., `assertNever(x)`)
 */
function isExhaustivenessCheck(
  node: TSESTree.SwitchStatement,
  services: ParserServices | undefined,
): boolean {
  const defaultCase = node.cases.find(c => c.test === null);
  if (!defaultCase) {
    return false;
  }
  for (const stmt of defaultCase.consequent) {
    if (hasNeverTypeAnnotation(stmt)) {
      return true;
    }
    if (isRequiredParserServices(services) && hasNeverTypedCallArg(stmt, services)) {
      return true;
    }
  }
  return false;
}

/** Checks if a statement is a VariableDeclaration with a `never` type annotation. */
function hasNeverTypeAnnotation(stmt: TSESTree.Statement): boolean {
  if (stmt.type !== 'VariableDeclaration') {
    return false;
  }
  return stmt.declarations.some(d => {
    if (d.type !== 'VariableDeclarator' || d.id.type !== 'Identifier') {
      return false;
    }
    return d.id.typeAnnotation?.typeAnnotation.type === 'TSNeverKeyword';
  });
}

/** Checks if a statement contains a call expression with a `never`-typed argument. */
function hasNeverTypedCallArg(stmt: TSESTree.Statement, services: RequiredParserServices): boolean {
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
  return callExpr.arguments.some(arg => {
    const type = getTypeFromTreeNode(arg as unknown as estree.Node, services);
    return type.flags === ts.TypeFlags.Never;
  });
}
