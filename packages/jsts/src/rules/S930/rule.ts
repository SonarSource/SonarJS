/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
// https://sonarsource.github.io/rspec/#/rspec/S930

import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';
import { Rule, Scope } from 'eslint';
import {
  docsUrl,
  getMainFunctionTokenLocation,
  isArrowFunctionExpression,
  isFunctionDeclaration,
  isFunctionExpression,
  isIdentifier,
  issueLocation,
  IssueLocation,
  report,
  RuleContext,
} from '../helpers';
import estree from 'estree';

const message = 'This function expects {{expectedArguments}}, but {{providedArguments}} provided.';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      tooManyArguments: message,
      sonarRuntime: '{{sonarRuntimeData}}',
    },
    type: 'problem',
    docs: {
      description: 'Function calls should not pass extra arguments',
      recommended: true,
      url: docsUrl(__filename),
    },
    schema: [
      {
        // internal parameter
        type: 'string',
        enum: ['sonar-runtime'],
      },
    ],
  },
  create(context) {
    const callExpressionsToCheck: Array<{
      callExpr: estree.CallExpression;
      functionNode: estree.Function;
    }> = [];
    const usingArguments: Set<estree.Node> = new Set();
    const emptyFunctions: Set<estree.Node> = new Set();

    return {
      CallExpression(callExpr: estree.CallExpression) {
        if (isIdentifier(callExpr.callee)) {
          const reference = context.sourceCode
            .getScope(callExpr)
            .references.find(ref => ref.identifier === callExpr.callee);
          const definition = reference && getSingleDefinition(reference);
          if (definition) {
            if (definition.type === 'FunctionName') {
              checkFunction(callExpr, definition.node);
            } else if (definition.type === 'Variable') {
              const { init } = definition.node as TSESTree.VariableDeclarator;
              if (init && (isFunctionExpression(init) || isArrowFunctionExpression(init))) {
                checkFunction(callExpr, init as estree.Function);
              }
            }
          }
        } else if (
          isArrowFunctionExpression(callExpr.callee as TSESTree.Node) ||
          isFunctionExpression(callExpr.callee as TSESTree.Node)
        ) {
          // IIFE
          checkFunction(callExpr, callExpr.callee as estree.Function);
        }
      },

      ':function'(node: estree.Node) {
        const fn = node as TSESTree.FunctionExpression;
        if (
          fn.body.type === AST_NODE_TYPES.BlockStatement &&
          fn.body.body.length === 0 &&
          fn.params.length === 0
        ) {
          emptyFunctions.add(node);
        }
      },

      'FunctionDeclaration > BlockStatement Identifier'(node: estree.Identifier) {
        checkArguments(node);
      },

      'FunctionExpression > BlockStatement Identifier'(node: estree.Identifier) {
        checkArguments(node);
      },

      'Program:exit'() {
        callExpressionsToCheck.forEach(({ callExpr, functionNode }) => {
          if (!usingArguments.has(functionNode) && !emptyFunctions.has(functionNode)) {
            reportIssue(callExpr, functionNode);
          }
        });
      },
    };

    function getSingleDefinition(reference: Scope.Reference): Scope.Definition | undefined {
      if (reference && reference.resolved) {
        const variable = reference.resolved;
        if (variable.defs.length === 1) {
          return variable.defs[0];
        }
      }
      return undefined;
    }

    function checkArguments(identifier: estree.Identifier) {
      if (identifier.name === 'arguments') {
        const reference = context.sourceCode
          .getScope(identifier)
          .references.find(ref => ref.identifier === identifier);
        const definition = reference && getSingleDefinition(reference);
        // special `arguments` variable has no definition
        if (!definition) {
          const ancestors = context.sourceCode.getAncestors(identifier).reverse();
          const fn = ancestors.find(
            node =>
              isFunctionDeclaration(node as TSESTree.Node) ||
              isFunctionExpression(node as TSESTree.Node),
          );
          if (fn) {
            usingArguments.add(fn);
          }
        }
      }
    }

    function checkFunction(callExpr: estree.CallExpression, functionNode: estree.Function) {
      const hasRest = functionNode.params.some(param => param.type === 'RestElement');
      if (!hasRest && callExpr.arguments.length > functionNode.params.length) {
        callExpressionsToCheck.push({ callExpr, functionNode });
      }
    }

    function reportIssue(callExpr: estree.CallExpression, functionNode: estree.Function) {
      const paramLength = functionNode.params.length;
      const argsLength = callExpr.arguments.length;
      // prettier-ignore
      const expectedArguments =
        paramLength === 0 ? "no arguments" :
        paramLength === 1 ? "1 argument" :
        `${paramLength} arguments`;

      // prettier-ignore
      const providedArguments =
        argsLength === 0 ? "none was" :
        argsLength === 1 ? "1 was" :
        `${argsLength} were`;

      report(
        context,
        {
          messageId: 'tooManyArguments',
          data: {
            expectedArguments,
            providedArguments,
          },
          node: callExpr.callee,
        },
        getSecondaryLocations(callExpr, functionNode),
        message,
      );
    }

    function getSecondaryLocations(callExpr: estree.CallExpression, functionNode: estree.Function) {
      const paramLength = functionNode.params.length;
      const secondaryLocations: IssueLocation[] = [];
      if (paramLength > 0) {
        const startLoc = (functionNode.params[0] as TSESTree.Parameter).loc;
        const endLoc = (functionNode.params[paramLength - 1] as TSESTree.Parameter).loc;
        secondaryLocations.push(issueLocation(startLoc, endLoc, 'Formal parameters'));
      } else {
        // as we're not providing parent node, `getMainFunctionTokenLocation` may return `undefined`
        const fnToken = getMainFunctionTokenLocation(
          functionNode as TSESTree.FunctionLike,
          undefined,
          context as unknown as RuleContext,
        );
        if (fnToken) {
          secondaryLocations.push(issueLocation(fnToken, fnToken, 'Formal parameters'));
        }
      }
      // find actual extra arguments to highlight
      callExpr.arguments.forEach((argument, index) => {
        if (index >= paramLength) {
          const { loc } = argument as TSESTree.CallExpressionArgument;
          secondaryLocations.push({
            message: 'Extra argument',
            column: loc.start.column,
            line: loc.start.line,
            endColumn: loc.end.column,
            endLine: loc.end.line,
          });
        }
      });
      return secondaryLocations;
    }
  },
};
