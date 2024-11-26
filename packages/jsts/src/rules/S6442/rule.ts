/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S6442/javascript

import type { Rule, Scope } from 'eslint';
import estree from 'estree';
import {
  findFirstMatchingLocalAncestor,
  generateMeta,
  getFullyQualifiedName,
  getVariableFromName,
  isFunctionNode,
  isIdentifier,
} from '../helpers/index.js';
import { TSESTree } from '@typescript-eslint/utils';
import { meta } from './meta.js';

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
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      noHookSetterInBody:
        'Remove this state setter call, perhaps move it to an event handler or JSX attribute',
    },
  }),
  create(context: Rule.RuleContext) {
    function isHookCall(node: estree.CallExpression): boolean {
      return (
        getFullyQualifiedName(context, node) === `${REACT_MODULE}.${HOOK_FUNCTION}` &&
        node.arguments.length === 1
      );
    }

    function getReactComponentScope(node: estree.Node): Scope.Scope | null {
      const scope = context.sourceCode.getScope(node);
      const isReact = isFunctionNode(scope.block) && matchesReactComponentName(scope.block, 1);
      return isReact ? scope : null;
    }

    function isInsideFunctionScope(scope: Scope.Scope | null, node: estree.Node): boolean {
      function searchUpperFunctionScope(current: Scope.Scope | null): Scope.Scope | null {
        if (current === null) {
          return null;
        } else if (current.type === 'function') {
          return current;
        } else {
          return searchUpperFunctionScope(current.upper);
        }
      }

      return (
        scope !== null && searchUpperFunctionScope(context.sourceCode.getScope(node)) === scope
      );
    }

    function isInsideConditional(node: estree.Node): boolean {
      return (
        findFirstMatchingLocalAncestor(node as TSESTree.Node, n => n.type === 'IfStatement') !==
        undefined
      );
    }

    let reactComponentScope: Scope.Scope | null; // Scope.Scope of the React component render function.
    const setters: Scope.Variable[] = []; // Setter variables returned by the React useState() function.

    return {
      ':function'(node: estree.Node) {
        reactComponentScope ??= getReactComponentScope(node); // Store the top-most React component scope.
      },

      ':function:exit'(node: estree.Node) {
        if (context.sourceCode.getScope(node) === reactComponentScope) {
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
        if (!isInsideFunctionScope(reactComponentScope, node)) {
          return;
        }

        const hookDeclarator = node as HookDeclarator;

        if (isHookCall(hookDeclarator.init)) {
          const variable = getVariableFromName(context, hookDeclarator.id.elements[1].name, node);
          if (variable != null) {
            setters.push(variable);
          }
        }
      },

      // Selector matching function calls like: setCount(1)
      'CallExpression[callee.type="Identifier"][arguments.length=1]'(node: estree.CallExpression) {
        if (
          !isInsideFunctionScope(reactComponentScope, node) ||
          setters.length === 0 ||
          isInsideConditional(node)
        ) {
          return;
        }

        const maybeSetterCall = node as SetterCall;

        const calleeVariable = getVariableFromName(context, maybeSetterCall.callee.name, node);
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
