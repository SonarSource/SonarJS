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
// https://sonarsource.github.io/rspec/#/rspec/S9114/javascript

import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import type estree from 'estree';
import {
  findFirstMatchingAncestor,
  findFirstMatchingLocalAncestor,
  getNodeParent,
} from '../helpers/ancestor.js';
import {
  getVariableFromName,
  isCallResult,
  isFunctionNode,
  isIdentifier,
  isNullLiteral,
} from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getFullyQualifiedName, isRequire } from '../helpers/module.js';
import {
  getComponentIdentifier,
  isReactClassComponent,
} from '../helpers/react/component-analysis.js';
import * as meta from './generated-meta.js';

const supportedModules = new Set(['lodash', 'lodash-es', 'underscore']);
const methodNames = new Set(['debounce', 'throttle']);
const componentNamePattern = /^[A-Z]/;
const customHookNamePattern = /^use[A-Z]/;

type MethodName = 'debounce' | 'throttle';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      recreatedPerRender:
        'This {{kind}} function is recreated on every render, which resets its timer and defeats {{purpose}}. Move it outside the component or hook, or wrap it in useMemo.',
      recreatedInClassRender:
        'This {{kind}} function is recreated on every render, which resets its timer and defeats {{purpose}}. Initialize it in the constructor or as an instance property.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      CallExpression(node: estree.Node) {
        const call = node as estree.CallExpression;
        const syntacticMethod = getSyntacticMethodName(call.callee);
        if (syntacticMethod === undefined) {
          return;
        }

        const fullyQualifiedName = getFullyQualifiedName(context, call);
        const methodName =
          fullyQualifiedName === null ? undefined : getSupportedMethodName(fullyQualifiedName);
        if (methodName === undefined) {
          return;
        }

        const enclosingFunction = findFirstEnclosingFunction(call);
        if (enclosingFunction === undefined) {
          return;
        }

        const componentType = getComponentType(enclosingFunction);
        if (componentType === undefined) {
          return;
        }

        if (
          isWrappedInMemoHook(context, call, enclosingFunction) ||
          isRefLazyInitialization(context, call) ||
          isDirectRefInitializer(context, call)
        ) {
          return;
        }

        context.report({
          node: getReportNode(call.callee),
          messageId: componentType === 'function' ? 'recreatedPerRender' : 'recreatedInClassRender',
          data: {
            kind: methodName === 'debounce' ? 'debounced' : 'throttled',
            purpose: methodName === 'debounce' ? 'debouncing' : 'throttling',
          },
        });
      },
    };
  },
};

/**
 * Returns the debounce/throttle method name when `fullyQualifiedName` points to
 * a supported module (`lodash`, `lodash-es`, or `underscore`), or undefined
 * otherwise.
 */
function getSupportedMethodName(fullyQualifiedName: string): MethodName | undefined {
  const parts = fullyQualifiedName.replaceAll('/', '.').split('.');
  if (parts.length !== 2) {
    return undefined;
  }
  const [moduleName, qualifier] = parts;
  if (supportedModules.has(moduleName) && isMethodName(qualifier)) {
    return qualifier;
  }
  return undefined;
}

/**
 * Returns the debounce/throttle name carried by the callee syntax, null when
 * the callee is an identifier or call result without that name (the fully
 * qualified name must then decide), or undefined when the callee cannot be a
 * supported call.
 */
function getSyntacticMethodName(
  callee: estree.Expression | estree.Super,
): MethodName | null | undefined {
  if (callee.type === 'ChainExpression') {
    return getSyntacticMethodName(callee.expression);
  }
  if (callee.type === 'MemberExpression') {
    if (callee.computed || !isIdentifier(callee.property)) {
      return undefined;
    }
    if (isCallResult(callee.object) && !isRequire(callee.object)) {
      return undefined;
    }
    const propertyName = callee.property.name;
    return isMethodName(propertyName) ? propertyName : undefined;
  }
  if (callee.type === 'Identifier' || callee.type === 'CallExpression') {
    return null;
  }
  return undefined;
}

function isMethodName(name: string): name is MethodName {
  return methodNames.has(name);
}

/**
 * Returns the innermost function that encloses `node`, or undefined when the
 * node sits at module scope. When that function is not the React component
 * itself (a hook callback, an event handler, ...), the call is not made
 * directly in the component body and must not be reported.
 */
function findFirstEnclosingFunction(node: estree.Node): estree.Node | undefined {
  return findFirstMatchingLocalAncestor(node as TSESTree.Node, ancestor =>
    isFunctionNode(ancestor as unknown as estree.Node),
  ) as estree.Node | undefined;
}

function getComponentType(functionNode: estree.Node): 'function' | 'class' | undefined {
  if (isFunctionComponent(functionNode)) {
    return 'function';
  }
  return isClassComponentRenderMethod(functionNode) ? 'class' : undefined;
}

function isFunctionComponent(functionNode: estree.Node): boolean {
  const identifier = getComponentIdentifier(functionNode);
  return (
    identifier !== undefined &&
    (componentNamePattern.test(identifier.name) || customHookNamePattern.test(identifier.name))
  );
}

function isRefLazyInitialization(context: Rule.RuleContext, call: estree.CallExpression): boolean {
  const assignment = getNodeParent(call);
  if (
    assignment.type !== 'AssignmentExpression' ||
    assignment.operator !== '=' ||
    !isRefCurrentMember(assignment.left)
  ) {
    return false;
  }

  const refIdentifier = assignment.left.object;
  if (!isReactUseRef(context, refIdentifier)) {
    return false;
  }

  const statement = getNodeParent(assignment);
  if (statement.type !== 'ExpressionStatement') {
    return false;
  }

  const ifStatement = getGuardingIfStatement(statement);
  return ifStatement !== undefined && isRefInitializationGuard(ifStatement.test, refIdentifier);
}

function getGuardingIfStatement(
  statement: estree.ExpressionStatement,
): estree.IfStatement | undefined {
  const parent = getNodeParent(statement);
  if (parent.type === 'IfStatement' && parent.consequent === statement) {
    return parent;
  }
  if (parent.type !== 'BlockStatement') {
    return undefined;
  }
  const ifStatement = getNodeParent(parent);
  return ifStatement.type === 'IfStatement' && ifStatement.consequent === parent
    ? ifStatement
    : undefined;
}

function isReactUseRef(context: Rule.RuleContext, refIdentifier: estree.Identifier): boolean {
  const variable = getVariableFromName(context, refIdentifier.name, refIdentifier);
  if (variable?.defs.length !== 1 || variable.defs[0].type !== 'Variable') {
    return false;
  }
  const init = variable.defs[0].node.init;
  return init?.type === 'CallExpression' && isReactUseRefCall(context, init);
}

function isDirectRefInitializer(context: Rule.RuleContext, call: estree.CallExpression): boolean {
  const parent = getNodeParent(call);
  return (
    parent.type === 'CallExpression' &&
    parent.arguments[0] === call &&
    isDirectReactUseRefCall(context, parent)
  );
}

function isReactUseRefCall(context: Rule.RuleContext, call: estree.CallExpression): boolean {
  return getFullyQualifiedName(context, call) === 'react.useRef';
}

function isDirectReactUseRefCall(context: Rule.RuleContext, call: estree.CallExpression): boolean {
  const { callee } = call;
  if (callee.type === 'Identifier') {
    return isReactUseRefImport(context, callee);
  }
  return (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    isIdentifier(callee.property, 'useRef') &&
    isReactModuleReference(context, callee.object)
  );
}

function isReactUseRefImport(context: Rule.RuleContext, identifier: estree.Identifier): boolean {
  const definition = getVariableFromName(context, identifier.name, identifier)?.defs[0];
  return (
    definition?.type === 'ImportBinding' &&
    definition.node.type === 'ImportSpecifier' &&
    definition.node.imported.type === 'Identifier' &&
    definition.node.imported.name === 'useRef' &&
    definition.node.local.name === 'useRef' &&
    isReactImportDeclaration(definition.parent)
  );
}

function isReactModuleReference(context: Rule.RuleContext, node: estree.Node): boolean {
  if (!isIdentifier(node)) {
    return false;
  }
  const definition = getVariableFromName(context, node.name, node)?.defs[0];
  if (definition?.type === 'ImportBinding') {
    return (
      (definition.node.type === 'ImportDefaultSpecifier' ||
        definition.node.type === 'ImportNamespaceSpecifier') &&
      isReactImportDeclaration(definition.parent)
    );
  }
  return false;
}

function isReactImportDeclaration(node: estree.Node): boolean {
  return node.type === 'ImportDeclaration' && node.source.value === 'react';
}

function isRefCurrentMember(
  node: estree.Node,
): node is estree.MemberExpression & { object: estree.Identifier; property: estree.Identifier } {
  return (
    node.type === 'MemberExpression' &&
    !node.computed &&
    isIdentifier(node.object) &&
    isIdentifier(node.property, 'current')
  );
}

function isRefInitializationGuard(
  test: estree.Expression,
  refIdentifier: estree.Identifier,
): boolean {
  if (
    test.type === 'UnaryExpression' &&
    test.operator === '!' &&
    isRefCurrentMemberFor(test.argument, refIdentifier)
  ) {
    return true;
  }
  if (test.type !== 'BinaryExpression' || !['===', '=='].includes(test.operator)) {
    return false;
  }
  return (
    (isRefCurrentMemberFor(test.left, refIdentifier) && isNullLiteral(test.right)) ||
    (isNullLiteral(test.left) && isRefCurrentMemberFor(test.right, refIdentifier))
  );
}

function isRefCurrentMemberFor(
  node: estree.Node,
  refIdentifier: estree.Identifier,
): node is estree.MemberExpression {
  return isRefCurrentMember(node) && node.object.name === refIdentifier.name;
}

function isClassComponentRenderMethod(functionNode: estree.Node): boolean {
  const renderMember = getNodeParent(functionNode);
  if (!isRenderMember(renderMember)) {
    return false;
  }

  const enclosingClass = findFirstMatchingAncestor(
    renderMember as TSESTree.Node,
    ancestor => ancestor.type === 'ClassDeclaration' || ancestor.type === 'ClassExpression',
  );
  return enclosingClass !== undefined && isReactClassComponent(enclosingClass as estree.Node);
}

function isRenderMember(node: estree.Node): boolean {
  return (
    (node.type === 'MethodDefinition' || node.type === 'PropertyDefinition') &&
    !node.computed &&
    !node.static &&
    isIdentifier(node.key, 'render')
  );
}

const memoHooks = new Set(['useMemo', 'useCallback']);

/**
 * Whether `call` is wrapped in a useMemo/useCallback call before reaching
 * `boundaryFunction`. Calls inside a hook callback are already excluded by
 * findFirstEnclosingFunction; this covers `useCallback(debounce(fn, ms))`,
 * where the debounced function is created as a direct hook argument.
 */
function isWrappedInMemoHook(
  context: Rule.RuleContext,
  call: estree.CallExpression,
  boundaryFunction: estree.Node,
): boolean {
  const ancestors = context.sourceCode.getAncestors(call);
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i];
    if (ancestor === boundaryFunction) {
      return false;
    }
    if (ancestor.type === 'CallExpression') {
      const calleeName = getHookCalleeName(context, ancestor);
      if (calleeName !== undefined && memoHooks.has(calleeName)) {
        return true;
      }
    }
  }
  return false;
}

function getHookCalleeName(
  context: Rule.RuleContext,
  call: estree.CallExpression,
): string | undefined {
  if (call.callee.type === 'Identifier') {
    return call.callee.name;
  }
  return getFullyQualifiedName(context, call)?.replace(/^react\./, '');
}

function getReportNode(callee: estree.Expression | estree.Super): estree.Node {
  if (callee.type === 'ChainExpression') {
    return getReportNode(callee.expression);
  }
  if (callee.type === 'MemberExpression') {
    return callee.property;
  }
  return callee;
}
