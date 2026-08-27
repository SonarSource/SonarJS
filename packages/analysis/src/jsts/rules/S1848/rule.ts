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
import {
  getUniqueWriteReference,
  getVariableFromName,
  getVariableFromScope,
  isIdentifier,
  isRequireModule,
} from '../helpers/ast.js';
import * as meta from './generated-meta.js';

/**
 * Paper.js constructors that auto-register with the active project layer.
 * Value objects (Point, Size, Color, Matrix, etc.) are intentionally excluded.
 */
const PAPER_ITEM_CONSTRUCTORS = new Set([
  'Layer',
  'Group',
  'Raster',
  'Path',
  'CompoundPath',
  'PointText',
  'SymbolItem',
  'Project',
  'Path.Line',
  'Path.Circle',
  'Path.Rectangle',
  'Path.Ellipse',
  'Path.Arc',
  'Path.RegularPolygon',
  'Path.Star',
  'Shape.Circle',
  'Shape.Rectangle',
  'Shape.Ellipse',
]);

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
const STATEMENT_ANCESTOR_OFFSET = 1;
const CONTAINER_ANCESTOR_OFFSET = 2;

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

/**
 * Suppresses false positives for RegExp validation patterns where the constructor is used only
 * to validate an input before returning it.
 *
 * For example, `new RegExp(pattern)` is intentional in:
 *
 * ```js
 * function validatePattern(pattern) {
 *   new RegExp(pattern);
 *   return pattern;
 * }
 * ```
 */
function isRegExpValidation(node: estree.NewExpression, context: Rule.RuleContext): boolean {
  if (!isBuiltInRegExpConstructor(node, context)) {
    return false;
  }

  const nextStatement = getNextSiblingStatement(node, context);
  if (nextStatement?.type !== 'ReturnStatement') {
    return false;
  }

  const { argument: returnArgument } = nextStatement;
  if (!returnArgument) {
    return false;
  }

  return node.arguments.some(
    argument => isIdentifier(argument) && containsReturnedIdentifier(returnArgument, argument),
  );
}

function isBuiltInRegExpConstructor(
  node: estree.NewExpression,
  context: Rule.RuleContext,
): boolean {
  const { callee } = node;
  const scope = context.sourceCode.getScope(node);

  if (isIdentifier(callee, 'RegExp')) {
    return !getVariableFromScope(scope, callee.name)?.defs.length;
  }

  return (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    isIdentifier(callee.object, 'globalThis') &&
    !getVariableFromScope(scope, callee.object.name)?.defs.length &&
    isIdentifier(callee.property, 'RegExp')
  );
}

function getNextSiblingStatement(
  node: estree.Node,
  context: Rule.RuleContext,
): estree.Statement | undefined {
  const ancestors = context.sourceCode.getAncestors(node);
  const statement = ancestors.at(-STATEMENT_ANCESTOR_OFFSET);
  const container = ancestors.at(-CONTAINER_ANCESTOR_OFFSET);
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
 * These exceptions are based on community requests and Peach.
 * Two separate checks: one FQN-backed, one for explicit global/member-expression forms.
 */
function isException(
  context: Rule.RuleContext,
  node: estree.Identifier | estree.MemberExpression,
  name: string,
) {
  const fqn = getFullyQualifiedName(context, node);
  if (fqn !== null && isFqnException(fqn)) {
    return true;
  }
  return isGlobalFormException(context, node, name);
}

/** Checks import-resolved FQN against the curated list of known side-effect constructors. */
function isFqnException(fqn: string): boolean {
  const exactExceptions = ['vue', '@ag-grid-community.core.Grid'];
  const startsWithExceptions = ['aws-cdk-lib', 'cdk8s', '@pulumi', '@cdktf', 'obsidian'];
  return (
    exactExceptions.includes(fqn) || startsWithExceptions.some(prefix => fqn.startsWith(prefix))
  );
}

/**
 * Checks explicitly approved global/member-expression forms.
 * For window.ClipboardJS, paper.*, and paperScope.*, verifies the root identifier
 * is not a local variable or import (i.e. it is a true global).
 * For paper.* and paperScope.*, only suppresses known scene-graph constructors.
 */
function isGlobalFormException(
  context: Rule.RuleContext,
  callee: estree.Identifier | estree.MemberExpression,
  calleeText: string,
): boolean {
  if (calleeText === 'Notification') {
    return true;
  }
  if (calleeText === 'window.ClipboardJS') {
    const variable = getVariableFromName(context, 'window', callee);
    if (variable == null || variable.defs.length === 0) {
      return true;
    }
  }
  for (const rootName of ['paper', 'paperScope']) {
    const prefix = `${rootName}.`;
    if (!calleeText.startsWith(prefix)) {
      continue;
    }
    const itemName = calleeText.slice(prefix.length);
    if (!PAPER_ITEM_CONSTRUCTORS.has(itemName)) {
      continue;
    }
    const variable = getVariableFromName(context, rootName, callee);
    // Suppress only when rootName is a true global (not locally declared)
    if (variable == null || variable.defs.length === 0) {
      return true;
    }
  }
  return false;
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
function containsDomSelection(
  node: estree.Node,
  scope: Scope.Scope,
  visitedVariables = new Set<Scope.Variable>(),
): boolean {
  node = unwrapTypeAssertion(node);
  if (node.type === 'CallExpression') {
    return (
      isDomSelectionCall(node, scope) ||
      (node.callee.type === 'MemberExpression' &&
        containsDomSelection(node.callee.object, scope, visitedVariables))
    );
  }
  if (node.type === 'Identifier') {
    // Resolve variable to check its initializer
    return isVariableFromDomSelection(node, scope, visitedVariables);
  }
  if (node.type === 'MemberExpression') {
    // Check if object is a DOM selection call (e.g., document.querySelector(...).dataset)
    return containsDomSelection(node.object, scope, visitedVariables);
  }
  if (node.type === 'ObjectExpression') {
    // Check properties for DOM selection calls (e.g., {element: $('foo')})
    return node.properties.some(prop => {
      if (prop.type === 'Property') {
        return containsDomSelection(prop.value, scope, visitedVariables);
      }
      return false;
    });
  }
  if (node.type === 'ArrayExpression') {
    // Check array elements for DOM selection calls (e.g., [$('foo'), $('bar')])
    return node.elements.some(
      elem => elem !== null && containsDomSelection(elem, scope, visitedVariables),
    );
  }
  if (node.type === 'ConditionalExpression') {
    return (
      containsDomSelection(node.consequent, scope, visitedVariables) ||
      containsDomSelection(node.alternate, scope, visitedVariables)
    );
  }
  return false;
}

/**
 * Checks if a variable was initialized from a DOM selection call.
 */
function isVariableFromDomSelection(
  node: estree.Identifier,
  scope: Scope.Scope,
  visitedVariables: Set<Scope.Variable>,
): boolean {
  const variable = getVariableFromIdentifier(node, scope);
  if (!variable || visitedVariables.has(variable)) {
    return false;
  }
  visitedVariables.add(variable);

  // When the read happens inside a function nested below the variable's own
  // declaring function (e.g. a helper invoked later), lexical write/read
  // order no longer reflects execution order, so fall back to requiring a
  // single write across the whole variable lifetime instead of "before use".
  const isDeferredRead = nearestFunctionScope(scope) !== nearestFunctionScope(variable.scope);

  const writeExpr = isDeferredRead
    ? getUniqueWriteReference(variable)
    : getUniqueWriteReferenceBefore(variable, node);
  if (!writeExpr) {
    return false;
  }

  // Follow a local initializer only. This permits DOM-derived member/call chains
  // without performing interprocedural analysis.
  return containsDomSelection(unwrapTypeAssertion(writeExpr), scope, visitedVariables);
}

function nearestFunctionScope(scope: Scope.Scope): Scope.Scope {
  let current = scope;
  while (current.type !== 'function' && current.type !== 'module' && current.type !== 'global') {
    if (!current.upper) {
      return current;
    }
    current = current.upper;
  }
  return current;
}

function getUniqueWriteReferenceBefore(
  variable: Scope.Variable,
  node: estree.Identifier,
): estree.Node | undefined {
  const useStart = node.range?.[0];
  const writeReferences = variable.references.filter(reference => {
    const writeEnd = reference.identifier.range?.[1];
    return (
      reference.isWrite() &&
      writeEnd !== undefined &&
      useStart !== undefined &&
      writeEnd <= useStart
    );
  });
  return writeReferences.length === 1 ? writeReferences[0].writeExpr ?? undefined : undefined;
}

/**
 * Unwraps TypeScript type assertions to get the underlying expression.
 * Handles: x as Type, <Type>x, x!, and optional chains.
 */
function unwrapTypeAssertion(node: estree.Node): estree.Node {
  // TypeScript AST types TSAsExpression and TSTypeAssertion are not in estree
  const nodeType = node.type as string;
  if (
    nodeType === 'TSAsExpression' ||
    nodeType === 'TSTypeAssertion' ||
    nodeType === 'TSNonNullExpression' ||
    nodeType === 'ChainExpression'
  ) {
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
function isDomSelectionCall(node: estree.CallExpression, scope: Scope.Scope): boolean {
  const { callee } = node;

  // Check for $() or jQuery()
  if (isIdentifier(callee, ...JQUERY_IDENTIFIERS)) {
    return isTrustedJQueryBinding(scope, callee.name);
  }

  // Check for *.querySelector, *.getElementById, etc. on any object
  // This covers document.querySelector, myDocument.querySelector, this.document.querySelector, etc.
  if (
    callee.type === 'MemberExpression' &&
    isIdentifier(callee.property, ...DOM_SELECTION_METHODS)
  ) {
    if (
      isIdentifier(callee.object, 'document') &&
      !isTrustedDocumentBinding(scope)
    ) {
      return false;
    }
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

function isTrustedJQueryBinding(scope: Scope.Scope, name: string): boolean {
  const variable = getVariableFromScope(scope, name);
  if (!variable?.defs.length) {
    return true;
  }

  return variable.defs.some(def => {
    if (def.type === 'ImportBinding') {
      return def.parent.type === 'ImportDeclaration' && def.parent.source.value === 'jquery';
    }
    return (
      def.type === 'Variable' &&
      def.node.init?.type === 'CallExpression' &&
      isRequireModule(def.node.init, 'jquery')
    );
  });
}

function isTrustedDocumentBinding(scope: Scope.Scope): boolean {
  const variable = getVariableFromScope(scope, 'document');
  if (!variable?.defs.length) {
    return true;
  }

  return variable.defs.some(def => {
    const init = def.type === 'Variable' ? unwrapTypeAssertion(def.node.init ?? def.node) : undefined;
    return (
      init?.type === 'MemberExpression' &&
      isIdentifier(init.object, 'window') &&
      isIdentifier(init.property, 'document') &&
      !getVariableFromScope(scope, 'window')?.defs.length
    );
  });
}
