/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S6442/javascript

import { Rule, Scope as ESLintScope } from 'eslint';
import Variable = ESLintScope.Variable;
import Scope = ESLintScope.Scope;
import * as estree from 'estree';
import {
  findFirstMatchingLocalAncestor,
  getFullyQualifiedName,
  getVariableFromName,
  isFunctionNode,
  isIdentifier,
} from '../helpers';
import { TSESTree } from '@typescript-eslint/utils';

type HookDeclarator = estree.VariableDeclarator & {
  id: {
    elements: estree.Identifier[];
  };
  init: estree.CallExpression;
};

type SetterCall = estree.CallExpression & {
  callee: estree.Identifier;
};

const REACT_MODULE = 'react';
const REACT_PATTERN = /^[^a-z]/;
const HOOK_FUNCTION = 'useState';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      noHookSetterInBody:
        'Remove this state setter call, perhaps move it to an event handler or JSX attribute',
    },
  },
  create(context: Rule.RuleContext) {
    function isHookCall(node: estree.CallExpression): boolean {
      return (
        getFullyQualifiedName(context, node) === `${REACT_MODULE}.${HOOK_FUNCTION}` &&
        node.arguments.length === 1
      );
    }

    function getReactComponentScope(): Scope | null {
      const scope = context.getScope();
      const isReact = isFunctionNode(scope.block) && matchesReactComponentName(scope.block, 1);
      return isReact ? scope : null;
    }

    function isInsideFunctionScope(scope: Scope | null): boolean {
      function searchUpperFunctionScope(current: Scope | null): Scope | null {
        if (current === null) {
          return null;
        } else if (current.type === 'function') {
          return current;
        } else {
          return searchUpperFunctionScope(current.upper);
        }
      }

      return scope !== null && searchUpperFunctionScope(context.getScope()) === scope;
    }

    function isInsideConditional(node: estree.Node): boolean {
      return (
        findFirstMatchingLocalAncestor(node as TSESTree.Node, n => n.type === 'IfStatement') !==
        undefined
      );
    }

    let reactComponentScope: Scope | null; // Scope of the React component render function.
    const setters: Variable[] = []; // Setter variables returned by the React useState() function.

    return {
      ':function'() {
        reactComponentScope ??= getReactComponentScope(); // Store the top-most React component scope.
      },

      ':function:exit'() {
        if (context.getScope() === reactComponentScope) {
          // Clean variables when leaving the React component scope.
          reactComponentScope = null;
          setters.length = 0;
        }
      },

      // Selector matching declarations like: const [count, setCount] = useState(0);
      ['VariableDeclarator[init.type="CallExpression"]' +
        ':has(ArrayPattern[elements.length=2][elements.0.type="Identifier"][elements.1.type="Identifier"])'](
        node: estree.VariableDeclarator,
      ) {
        if (!isInsideFunctionScope(reactComponentScope)) {
          return;
        }

        const hookDeclarator = node as HookDeclarator;

        if (isHookCall(hookDeclarator.init)) {
          const variable = getVariableFromName(context, hookDeclarator.id.elements[1].name);
          if (variable != null) {
            setters.push(variable);
          }
        }
      },

      // Selector matching function calls like: setCount(1)
      'CallExpression[callee.type="Identifier"][arguments.length=1]'(node: estree.CallExpression) {
        if (
          !isInsideFunctionScope(reactComponentScope) ||
          setters.length === 0 ||
          isInsideConditional(node)
        ) {
          return;
        }

        const maybeSetterCall = node as SetterCall;

        const calleeVariable = getVariableFromName(context, maybeSetterCall.callee.name);
        if (setters.some(variable => variable === calleeVariable)) {
          context.report({
            messageId: 'noHookSetterInBody',
            node: node.callee,
          });
        }
      },
    };
  },
};

function hasParent(node: estree.Node): node is Rule.Node {
  return (node as Rule.Node).parent != null;
}

function matchesReactComponentName(node: estree.Node | null, max = 0): boolean {
  if (node == null) {
    return false;
  } else if (isIdentifier(node)) {
    return REACT_PATTERN.test(node.name);
  } else if (node.type === 'FunctionDeclaration') {
    return matchesReactComponentName(node.id);
  } else if (node.type === 'VariableDeclarator') {
    return matchesReactComponentName(node.id);
  } else if (node.type === 'AssignmentExpression') {
    return matchesReactComponentName(node.left);
  } else if (node.type === 'MemberExpression') {
    return matchesReactComponentName(node.property);
  } else if (hasParent(node) && max > 0) {
    return matchesReactComponentName(node.parent, max - 1);
  } else {
    return false;
  }
}
