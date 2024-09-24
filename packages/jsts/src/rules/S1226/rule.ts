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
// https://sonarsource.github.io/rspec/#/rspec/S1226/javascript

import { AST, Rule, Scope } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/utils';
import { generateMeta, getParent, resolveIdentifiers } from '../helpers/index.ts';
import { meta } from './meta.ts';

type ContextType = 'catch' | 'function' | 'foreach' | 'global';

interface ReassignmentContext {
  type: ContextType;
  variablesToCheckInCurrentScope: Set<string>;
  variablesToCheck: Set<string>;
  variablesRead: Set<string>;
  referencesByIdentifier: Map<estree.Identifier, Scope.Reference>;
  parentContext?: ReassignmentContext;
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      noReassignment:
        'Introduce a new variable or use its initial value before reassigning "{{reference}}".',
    },
  }),
  create(context: Rule.RuleContext) {
    let variableUsageContext: ReassignmentContext = {
      type: 'global',
      variablesToCheckInCurrentScope: new Set<string>(),
      variablesToCheck: new Set<string>(),
      variablesRead: new Set<string>(),
      referencesByIdentifier: new Map<estree.Identifier, Scope.Reference>(),
    };

    function checkIdentifierUsage(
      identifier: estree.Identifier,
      identifierContextType: ContextType,
    ) {
      if (variableUsageContext.type !== identifierContextType) {
        return;
      }

      const variableName = identifier.name;
      const currentReference = getReference(variableUsageContext, identifier);
      if (
        currentReference &&
        !currentReference.init &&
        !variableUsageContext.variablesRead.has(variableName)
      ) {
        if (
          variableUsageContext.variablesToCheck.has(variableName) &&
          currentReference.isWriteOnly() &&
          !isUsedInWriteExpression(variableName, currentReference.writeExpr)
        ) {
          // we do not raise issue when value is reassigned inside a top-level IfStatement, as it might be a shift or
          // default value reassignment
          if (
            isInsideIfStatement(context, identifier) ||
            context.sourceCode.getAncestors(identifier).some(node => node.type === 'SwitchCase') // issue-2398
          ) {
            return;
          }
          raiseIssue(currentReference);
        }
        markAsRead(variableUsageContext, variableName);
      } else if (variableName === 'arguments') {
        markAllFunctionArgumentsAsRead(variableUsageContext);
      }
    }

    function isUsedInWriteExpression(variableName: string, writeExpr: estree.Node | null) {
      return (
        writeExpr &&
        context.sourceCode.getFirstToken(
          writeExpr,
          token => token.value === variableName || token.value === 'arguments',
        )
      );
    }

    function raiseIssue(reference: Scope.Reference) {
      const locationHolder = getPreciseLocationHolder(reference);
      context.report({
        messageId: 'noReassignment',
        data: {
          reference: reference.identifier.name,
        },
        ...locationHolder,
      });
    }

    function popContext() {
      variableUsageContext = variableUsageContext.parentContext
        ? variableUsageContext.parentContext
        : variableUsageContext;
    }

    return {
      onCodePathStart(_codePath: Rule.CodePath, node: estree.Node) {
        const currentScope = context.sourceCode.getScope(node);
        if (currentScope && currentScope.type === 'function') {
          const { referencesByIdentifier, variablesToCheck, variablesToCheckInCurrentScope } =
            computeNewContextInfo(variableUsageContext, context, node);

          const functionName = getFunctionName(node as estree.FunctionExpression);
          if (functionName) {
            variablesToCheck.delete(functionName);
          }

          variableUsageContext = {
            type: 'function',
            parentContext: variableUsageContext,
            variablesToCheck,
            referencesByIdentifier,
            variablesToCheckInCurrentScope,
            variablesRead: computeSetDifference(
              variableUsageContext.variablesRead,
              variablesToCheckInCurrentScope,
            ),
          };
        } else {
          variableUsageContext = {
            type: 'global',
            parentContext: variableUsageContext,
            variablesToCheckInCurrentScope: new Set<string>(),
            variablesToCheck: new Set<string>(),
            variablesRead: new Set<string>(),
            referencesByIdentifier: new Map<estree.Identifier, Scope.Reference>(),
          };
        }
      },

      onCodePathSegmentLoop(
        _fromSegment: Rule.CodePathSegment,
        _toSegment: Rule.CodePathSegment,
        node: estree.Node,
      ) {
        const parent = getParent(context, node);
        if (!isForEachLoopStart(node, parent)) {
          return;
        }
        const currentScope = context.sourceCode.scopeManager.acquire(parent.body);
        const { referencesByIdentifier, variablesToCheck, variablesToCheckInCurrentScope } =
          computeNewContextInfo(variableUsageContext, context, parent.left);

        if (currentScope) {
          for (const ref of currentScope.references) {
            referencesByIdentifier.set(ref.identifier, ref);
          }
        }

        // In case of array or object pattern expression, the left hand side are not declared variables but simply identifiers
        resolveIdentifiers(parent.left as TSESTree.Node, true)
          .map(identifier => identifier.name)
          .forEach(name => {
            variablesToCheck.add(name);
            variablesToCheckInCurrentScope.add(name);
          });

        variableUsageContext = {
          type: 'foreach',
          parentContext: variableUsageContext,
          variablesToCheckInCurrentScope,
          variablesToCheck,
          variablesRead: computeSetDifference(
            variableUsageContext.variablesRead,
            variablesToCheckInCurrentScope,
          ),
          referencesByIdentifier,
        };
      },

      onCodePathSegmentStart(_segment: Rule.CodePathSegment, node: estree.Node) {
        if (node.type !== 'CatchClause') {
          return;
        }

        const { referencesByIdentifier, variablesToCheck, variablesToCheckInCurrentScope } =
          computeNewContextInfo(variableUsageContext, context, node);

        variableUsageContext = {
          type: 'catch',
          parentContext: variableUsageContext,
          variablesToCheckInCurrentScope,
          variablesToCheck,
          variablesRead: computeSetDifference(
            variableUsageContext.variablesRead,
            variablesToCheckInCurrentScope,
          ),
          referencesByIdentifier,
        };
      },

      onCodePathEnd: popContext,
      'ForInStatement:exit': popContext,
      'ForOfStatement:exit': popContext,
      'CatchClause:exit': popContext,
      '*:function > BlockStatement Identifier': (node: estree.Node) =>
        checkIdentifierUsage(node as estree.Identifier, 'function'),
      'ForInStatement > *:statement Identifier': (node: estree.Node) =>
        checkIdentifierUsage(node as estree.Identifier, 'foreach'),
      'ForOfStatement > *:statement Identifier': (node: estree.Node) =>
        checkIdentifierUsage(node as estree.Identifier, 'foreach'),
      'CatchClause > BlockStatement Identifier': (node: estree.Node) =>
        checkIdentifierUsage(node as estree.Identifier, 'catch'),
    };
  },
};

function isInsideIfStatement(context: Rule.RuleContext, node: estree.Node): boolean {
  const ancestors = context.sourceCode.getAncestors(node);
  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (
      ancestors[i].type === 'IfStatement' &&
      // We check if the consequent or the alternate are also ancestors
      // Nodes in the test attribute should be raised
      i < ancestors.length - 1 &&
      (ancestors[i + 1] === (ancestors[i] as estree.IfStatement).consequent ||
        ancestors[i + 1] === (ancestors[i] as estree.IfStatement).alternate)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Computes the set difference (a \ b)
 */
function computeSetDifference(a: Set<string>, b: Set<string>) {
  return new Set([...a].filter(str => !b.has(str)));
}

function getFunctionName(node: estree.FunctionExpression) {
  return !node.id ? null : node.id.name;
}

function isForEachLoopStart(
  node: estree.Node,
  parent?: estree.Node,
): parent is estree.ForInStatement | estree.ForOfStatement {
  return (
    node.type === 'BlockStatement' &&
    !!parent &&
    (parent.type === 'ForInStatement' || parent.type === 'ForOfStatement')
  );
}

function computeNewContextInfo(
  variableUsageContext: ReassignmentContext,
  context: Rule.RuleContext,
  node: estree.Node,
) {
  const referencesByIdentifier = new Map<estree.Identifier, Scope.Reference>();
  const variablesToCheck = new Set<string>(variableUsageContext.variablesToCheck);
  const variablesToCheckInCurrentScope = new Set<string>();
  context.sourceCode.getDeclaredVariables(node).forEach(variable => {
    variablesToCheck.add(variable.name);
    variablesToCheckInCurrentScope.add(variable.name);
    for (const currentRef of variable.references) {
      referencesByIdentifier.set(currentRef.identifier, currentRef);
    }
  });
  return { referencesByIdentifier, variablesToCheck, variablesToCheckInCurrentScope };
}

function markAsRead(context: ReassignmentContext, variableName: string) {
  context.variablesRead.add(variableName);
  if (!context.variablesToCheckInCurrentScope.has(variableName) && context.parentContext) {
    markAsRead(context.parentContext, variableName);
  }
}

function markAllFunctionArgumentsAsRead(variableUsageContext: ReassignmentContext) {
  let functionContext: ReassignmentContext | undefined = variableUsageContext;
  while (functionContext && functionContext.type !== 'function') {
    functionContext = functionContext.parentContext;
  }

  if (functionContext) {
    for (const variableName of functionContext.variablesToCheckInCurrentScope) {
      functionContext.variablesRead.add(variableName);
    }
  }
}

function getPreciseLocationHolder(
  reference: Scope.Reference,
): { node: estree.Node } | { loc: AST.SourceLocation } {
  const identifierLoc = reference.identifier.loc;
  if (identifierLoc && reference.writeExpr && reference.writeExpr.loc) {
    return { loc: { start: identifierLoc.start, end: reference.writeExpr.loc.end } };
  }
  return { node: reference.identifier };
}

function getReference(
  variableUsageContext: ReassignmentContext,
  identifier: estree.Identifier,
): Scope.Reference | undefined {
  const identifierReference = variableUsageContext.referencesByIdentifier.get(identifier);
  if (!identifierReference && variableUsageContext.parentContext) {
    return getReference(variableUsageContext.parentContext, identifier);
  }
  return identifierReference;
}
