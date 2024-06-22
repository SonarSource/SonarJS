/*
 * eslint-plugin-sonarjs
 * Copyright (C) 2018-2021 SonarSource SA
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

import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import {
  isArrowFunctionExpression,
  isFunctionDeclaration,
  isFunctionExpression,
  isIdentifier,
  isBlockStatement,
} from '../utils/nodes';
import {
  report,
  issueLocation,
  getMainFunctionTokenLocation,
  IssueLocation,
  toSecondaryLocation,
} from '../utils/locations';
import docsUrl from '../utils/docs-url';

const message = 'This function expects {{expectedArguments}}, but {{providedArguments}} provided.';

const rule: TSESLint.RuleModule<string, string[]> = {
  defaultOptions: [],
  meta: {
    messages: {
      tooManyArguments: message,
      sonarRuntime: '{{sonarRuntimeData}}',
    },
    type: 'problem',
    docs: {
      description: 'Function calls should not pass extra arguments',
      recommended: 'recommended',
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
      callExpr: TSESTree.CallExpression;
      functionNode: TSESTree.FunctionLike;
    }> = [];
    const usingArguments: Set<TSESTree.Node> = new Set();
    const emptyFunctions: Set<TSESTree.Node> = new Set();

    return {
      // eslint-disable-next-line sonarjs/cognitive-complexity
      CallExpression(node: TSESTree.Node) {
        const callExpr = node as TSESTree.CallExpression;
        if (isIdentifier(callExpr.callee)) {
          const reference = context.sourceCode
            .getScope(node)
            .references.find(ref => ref.identifier === callExpr.callee);
          const definition = reference && getSingleDefinition(reference);
          if (definition) {
            if (definition.type === 'FunctionName') {
              checkFunction(callExpr, definition.node);
            } else if (definition.type === 'Variable') {
              const { init } = definition.node;
              if (init && (isFunctionExpression(init) || isArrowFunctionExpression(init))) {
                checkFunction(callExpr, init);
              }
            }
          }
        } else if (
          isArrowFunctionExpression(callExpr.callee) ||
          isFunctionExpression(callExpr.callee)
        ) {
          // IIFE
          checkFunction(callExpr, callExpr.callee);
        }
      },

      ':function'(node: TSESTree.Node) {
        const fn = node as TSESTree.FunctionExpression;
        if (isBlockStatement(fn.body) && fn.body.body.length === 0 && fn.params.length === 0) {
          emptyFunctions.add(node);
        }
      },

      'FunctionDeclaration > BlockStatement Identifier'(node: TSESTree.Node) {
        checkArguments(node as TSESTree.Identifier);
      },

      'FunctionExpression > BlockStatement Identifier'(node: TSESTree.Node) {
        checkArguments(node as TSESTree.Identifier);
      },

      'Program:exit'() {
        callExpressionsToCheck.forEach(({ callExpr, functionNode }) => {
          if (!usingArguments.has(functionNode) && !emptyFunctions.has(functionNode)) {
            reportIssue(callExpr, functionNode);
          }
        });
      },
    };

    function getSingleDefinition(
      reference: TSESLint.Scope.Reference,
    ): TSESLint.Scope.Definition | undefined {
      if (reference && reference.resolved) {
        const variable = reference.resolved;
        if (variable.defs.length === 1) {
          return variable.defs[0];
        }
      }
      return undefined;
    }

    function checkArguments(identifier: TSESTree.Identifier) {
      if (identifier.name === 'arguments') {
        const reference = context.sourceCode
          .getScope(identifier)
          .references.find(ref => ref.identifier === identifier);
        const definition = reference && getSingleDefinition(reference);
        // special `arguments` variable has no definition
        if (!definition) {
          const ancestors = context.sourceCode.getAncestors(identifier).reverse();
          const fn = ancestors.find(
            node => isFunctionDeclaration(node) || isFunctionExpression(node),
          );
          if (fn) {
            usingArguments.add(fn);
          }
        }
      }
    }

    function checkFunction(callExpr: TSESTree.CallExpression, functionNode: TSESTree.FunctionLike) {
      const hasRest = functionNode.params.some(param => param.type === 'RestElement');
      if (!hasRest && callExpr.arguments.length > functionNode.params.length) {
        callExpressionsToCheck.push({ callExpr, functionNode });
      }
    }

    function reportIssue(callExpr: TSESTree.CallExpression, functionNode: TSESTree.FunctionLike) {
      const paramLength = functionNode.params.length;
      const argsLength = callExpr.arguments.length;
      // prettier-ignore
      const expectedArguments =
        // eslint-disable-next-line no-nested-ternary
        paramLength === 0 ? "no arguments" :
        paramLength === 1 ? "1 argument" :
        `${paramLength} arguments`;

      // prettier-ignore
      const providedArguments =
        // eslint-disable-next-line no-nested-ternary
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

    function getSecondaryLocations(
      callExpr: TSESTree.CallExpression,
      functionNode: TSESTree.FunctionLike,
    ) {
      const paramLength = functionNode.params.length;
      const secondaryLocations: IssueLocation[] = [];
      if (paramLength > 0) {
        const startLoc = functionNode.params[0].loc;
        const endLoc = functionNode.params[paramLength - 1].loc;
        secondaryLocations.push(issueLocation(startLoc, endLoc, 'Formal parameters'));
      } else {
        // as we're not providing parent node, `getMainFunctionTokenLocation` may return `undefined`
        const fnToken = getMainFunctionTokenLocation(functionNode, undefined, context);
        if (fnToken) {
          secondaryLocations.push(issueLocation(fnToken, fnToken, 'Formal parameters'));
        }
      }
      // find actual extra arguments to highlight
      callExpr.arguments.forEach((argument, index) => {
        if (index >= paramLength) {
          secondaryLocations.push(toSecondaryLocation(argument, 'Extra argument'));
        }
      });
      return secondaryLocations;
    }
  },
};

export = rule;
