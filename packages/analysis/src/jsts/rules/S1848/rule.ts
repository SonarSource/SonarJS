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
// https://sonarsource.github.io/rspec/#/rspec/S1848/javascript

import type { Rule, Scope } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { getFullyQualifiedName } from '../helpers/module.js';
import { getVariableFromIdentifier } from '../helpers/reaching-definitions.js';
import { isIdentifier } from '../helpers/ast.js';
import * as meta from './generated-meta.js';

/** DOM selection method names commonly used for element selection */
const DOM_SELECTION_METHODS = [
  'querySelector',
  'querySelectorAll',
  'getElementById',
  'getElementsByClassName',
  'getElementsByTagName',
  'getElementsByName',
];
/** jQuery/$ function names */
const JQUERY_IDENTIFIERS = ['$', 'jQuery'];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      removeInstantiationOf:
        'Either remove this useless object instantiation of "{{constructor}}" or use it.',
      removeInstantiation: 'Either remove this useless object instantiation or use it.',
    },
  }),
  create(context: Rule.RuleContext) {
    const sourceCode = context.sourceCode;
    return {
      'ExpressionStatement > NewExpression': (node: estree.NewExpression) => {
        if (isTryable(node, context)) {
          return;
        }
        // Skip constructors receiving DOM elements - indicates DOM attachment side effect
        if (hasDomSelectionArgument(node, context)) {
          return;
        }
        if (isRegExpValidation(node, context)) {
          return;
        }
        const { callee } = node;
        if (callee.type === 'Identifier' || callee.type === 'MemberExpression') {
          const calleeText = sourceCode.getText(callee);
          if (isException(context, callee, calleeText)) {
            return;
          }
          const reportLocation = {
            start: node.loc!.start,
            end: callee.loc!.end,
          };
          reportIssue(reportLocation, `${calleeText}`, 'removeInstantiationOf', context);
        } else {
          const newToken = sourceCode.getFirstToken(node);
          reportIssue(newToken!.loc, '', 'removeInstantiation', context);
        }
      },
    };
  },
};

function isTryable(node: estree.Node, context: Rule.RuleContext) {
  const ancestors = context.sourceCode.getAncestors(node);
  let parent = undefined;
  let child = node;
  while ((parent = ancestors.pop()) !== undefined) {
    if (parent.type === 'TryStatement' && parent.block === child) {
      return true;
    }
    child = parent;
  }
  return false;
}

function isRegExpValidation(node: estree.NewExpression, context: Rule.RuleContext): boolean {
  if (!isBuiltInRegExpConstructor(node, context)) {
    return false;
  }

  const nextStatement = getNextSiblingStatement(node, context);
  if (nextStatement?.type !== 'ReturnStatement' || !nextStatement.argument) {
    return false;
  }

  return node.arguments.some(
    argument =>
      isIdentifier(argument) && containsReturnedIdentifier(nextStatement.argument!, argument),
  );
}

function isBuiltInRegExpConstructor(
  node: estree.NewExpression,
  context: Rule.RuleContext,
): boolean {
  const { callee } = node;

  if (isIdentifier(callee, 'RegExp')) {
    return !isLocallyDefined(callee, context.sourceCode.getScope(node));
  }

  return (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    isIdentifier(callee.object, 'globalThis') &&
    !isLocallyDefined(callee.object, context.sourceCode.getScope(node)) &&
    isIdentifier(callee.property, 'RegExp')
  );
}

function isLocallyDefined(identifier: estree.Identifier, scope: Scope.Scope): boolean {
  let currentScope: Scope.Scope | null = scope;
  while (currentScope) {
    const variable = currentScope.variables.find(value => value.name === identifier.name);
    if (variable) {
      return variable.defs.length > 0;
    }
    currentScope = currentScope.upper;
  }
  return false;
}

function getNextSiblingStatement(
  node: estree.Node,
  context: Rule.RuleContext,
): estree.Statement | undefined {
  const ancestors = context.sourceCode.getAncestors(node);
  const statement = ancestors.at(-1);
  const container = ancestors.at(-2);
  if (statement?.type !== 'ExpressionStatement') {
    return undefined;
  }

  const body = getStatementList(container);
  if (!body) {
    return undefined;
  }

  const statementIndex = body.indexOf(statement);
  return statementIndex === -1 ? undefined : body[statementIndex + 1];
}

function getStatementList(node: estree.Node | undefined): estree.Statement[] | undefined {
  if (node?.type === 'BlockStatement') {
    return node.body;
  }
  if (node?.type === 'SwitchCase') {
    return node.consequent;
  }
  return undefined;
}

function containsReturnedIdentifier(node: estree.Node, identifier: estree.Identifier): boolean {
  if (isIdentifier(node, identifier.name)) {
    return true;
  }

  if (node.type === 'ObjectExpression') {
    return node.properties.some(property => {
      if (property.type === 'Property') {
        return containsReturnedIdentifier(property.value as estree.Node, identifier);
      }
      return containsReturnedIdentifier(property.argument, identifier);
    });
  }

  if (node.type === 'ArrayExpression') {
    return node.elements.some(element => {
      if (!element) {
        return false;
      }
      if (element.type === 'SpreadElement') {
        return containsReturnedIdentifier(element.argument, identifier);
      }
      return containsReturnedIdentifier(element, identifier);
    });
  }

  if (node.type === 'ConditionalExpression') {
    return (
      containsReturnedIdentifier(node.consequent, identifier) ||
      containsReturnedIdentifier(node.alternate, identifier)
    );
  }

  const nodeType = node.type as string;
  if (nodeType === 'TSAsExpression' || nodeType === 'TSTypeAssertion') {
    return containsReturnedIdentifier(
      (node as unknown as { expression: estree.Node }).expression,
      identifier,
    );
  }

  return false;
}

function reportIssue(
  loc: { start: estree.Position; end: estree.Position },
  objectText: string,
  messageId: string,
  context: Rule.RuleContext,
) {
  context.report({
    messageId,
    data: {
      constructor: objectText,
    },
    loc,
  });
}

/**
 * These exceptions are based on community requests and Peach
 */
function isException(
  context: Rule.RuleContext,
  node: estree.Identifier | estree.MemberExpression,
  name: string,
) {
  if (name === 'Notification') {
    return true;
  }

  const fqn = getFullyQualifiedName(context, node);
  if (!fqn) {
    return false;
  }
  const exactExceptions = ['vue', '@ag-grid-community.core.Grid'];
  const startsWithExceptions = ['aws-cdk-lib', 'cdk8s', '@pulumi', '@cdktf', 'obsidian'];
  return (
    exactExceptions.includes(fqn) ||
    startsWithExceptions.some(exception => fqn.startsWith(exception))
  );
}

/**
 * Checks if any constructor argument contains a DOM selection call.
 * Constructors receiving DOM elements typically attach to them on construction.
 */
function hasDomSelectionArgument(node: estree.NewExpression, context: Rule.RuleContext): boolean {
  const scope = context.sourceCode.getScope(node);
  return node.arguments.some(
    arg => arg.type !== 'SpreadElement' && containsDomSelection(arg, scope),
  );
}

/**
 * Recursively checks if a node contains a DOM selection call.
 * Also resolves variables to check if they were initialized from DOM selection.
 */
function containsDomSelection(node: estree.Node, scope: Scope.Scope): boolean {
  if (node.type === 'CallExpression') {
    return isDomSelectionCall(node);
  }
  if (node.type === 'Identifier') {
    // Resolve variable to check its initializer
    return isVariableFromDomSelection(node, scope);
  }
  if (node.type === 'MemberExpression') {
    // Check if object is a DOM selection call (e.g., document.querySelector(...).dataset)
    return containsDomSelection(node.object, scope);
  }
  if (node.type === 'ObjectExpression') {
    // Check properties for DOM selection calls (e.g., {element: $('foo')})
    return node.properties.some(prop => {
      if (prop.type === 'Property') {
        return containsDomSelection(prop.value, scope);
      }
      return false;
    });
  }
  if (node.type === 'ArrayExpression') {
    // Check array elements for DOM selection calls (e.g., [$('foo'), $('bar')])
    return node.elements.some(elem => elem !== null && containsDomSelection(elem, scope));
  }
  if (node.type === 'ConditionalExpression') {
    return (
      containsDomSelection(node.consequent, scope) || containsDomSelection(node.alternate, scope)
    );
  }
  return false;
}

/**
 * Checks if a variable was initialized from a DOM selection call.
 */
function isVariableFromDomSelection(node: estree.Identifier, scope: Scope.Scope): boolean {
  const variable = getVariableFromIdentifier(node, scope);
  if (!variable) {
    return false;
  }
  // Check each definition of the variable
  for (const def of variable.defs) {
    if (def.type === 'Variable' && def.node.init) {
      // Check if the initializer is a DOM selection call (possibly wrapped in type assertion)
      const initExpr = unwrapTypeAssertion(def.node.init);
      if (initExpr.type === 'CallExpression' && isDomSelectionCall(initExpr)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Unwraps TypeScript type assertions to get the underlying expression.
 * Handles: x as Type, <Type>x
 */
function unwrapTypeAssertion(node: estree.Node): estree.Node {
  // TypeScript AST types TSAsExpression and TSTypeAssertion are not in estree
  const nodeType = node.type as string;
  if (nodeType === 'TSAsExpression' || nodeType === 'TSTypeAssertion') {
    const expr = (node as unknown as { expression: estree.Node }).expression;
    return expr ? unwrapTypeAssertion(expr) : node;
  }
  return node;
}

/**
 * Checks if a call expression is a DOM selection call.
 * Matches: document.querySelector, document.getElementById, $(), jQuery(), this.$(),
 * and any call to DOM selection methods on any object (e.g., myDocument.querySelector)
 */
function isDomSelectionCall(node: estree.CallExpression): boolean {
  const { callee } = node;

  // Check for $() or jQuery()
  if (isIdentifier(callee, ...JQUERY_IDENTIFIERS)) {
    return true;
  }

  // Check for *.querySelector, *.getElementById, etc. on any object
  // This covers document.querySelector, myDocument.querySelector, this.document.querySelector, etc.
  if (
    callee.type === 'MemberExpression' &&
    isIdentifier(callee.property, ...DOM_SELECTION_METHODS)
  ) {
    return true;
  }

  // Check for this.$() - common in Backbone/Marionette views
  if (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'ThisExpression' &&
    isIdentifier(callee.property, ...JQUERY_IDENTIFIERS)
  ) {
    return true;
  }

  return false;
}
