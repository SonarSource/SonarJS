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
import { isFunctionNode, isIdentifier } from '../helpers/ast.js';
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

type MethodName = 'debounce' | 'throttle';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      recreatedPerRender:
        'This {{kind}} function is recreated on every render, which resets its timer and defeats {{purpose}}. Move it outside the component or wrap it in useMemo.',
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
          fullyQualifiedName === null
            ? undefined
            : getSupportedMethodName(fullyQualifiedName, syntacticMethod);
        if (methodName === undefined) {
          return;
        }

        const enclosingFunction = findFirstEnclosingFunction(call);
        if (enclosingFunction === undefined || !isRenderFunction(enclosingFunction)) {
          return;
        }

        if (isWrappedInMemoHook(context, call, enclosingFunction)) {
          return;
        }

        context.report({
          node: getReportNode(call.callee),
          messageId: 'recreatedPerRender',
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
 * a supported module, or undefined otherwise. A null `syntacticMethod` means
 * the callee carries no usable syntactic name (aliased or destructured
 * import), so the fully qualified name alone decides.
 */
function getSupportedMethodName(
  fullyQualifiedName: string,
  syntacticMethod: MethodName | null,
): MethodName | undefined {
  const parts = fullyQualifiedName.replaceAll('/', '.').split('.');
  if (parts.length !== 2) {
    return undefined;
  }
  const [moduleName, qualifier] = parts;
  if (
    supportedModules.has(moduleName) &&
    isMethodName(qualifier) &&
    (syntacticMethod === null || syntacticMethod === qualifier)
  ) {
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

function isCallResult(node: estree.Expression | estree.Super): node is estree.CallExpression {
  if (node.type === 'ChainExpression') {
    return isCallResult(node.expression);
  }
  return node.type === 'CallExpression';
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

function isRenderFunction(functionNode: estree.Node): boolean {
  return isFunctionComponent(functionNode) || isClassComponentRenderMethod(functionNode);
}

function isFunctionComponent(functionNode: estree.Node): boolean {
  const identifier = getComponentIdentifier(functionNode);
  return identifier !== undefined && componentNamePattern.test(identifier.name);
}

function isClassComponentRenderMethod(functionNode: estree.Node): boolean {
  const methodDefinition = getNodeParent(functionNode);
  if (!isRenderMethod(methodDefinition)) {
    return false;
  }

  const enclosingClass = findFirstMatchingAncestor(
    methodDefinition as TSESTree.Node,
    ancestor => ancestor.type === 'ClassDeclaration' || ancestor.type === 'ClassExpression',
  );
  return enclosingClass !== undefined && isReactClassComponent(enclosingClass as estree.Node);
}

function isRenderMethod(node: estree.Node): boolean {
  return (
    node.type === 'MethodDefinition' &&
    !node.computed &&
    !node.static &&
    node.kind === 'method' &&
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
