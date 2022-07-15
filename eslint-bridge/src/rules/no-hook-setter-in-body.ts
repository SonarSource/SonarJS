/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

import { Rule, Scope as EsLintScope } from 'eslint';
import * as estree from 'estree';
import {
  getModuleNameOfImportedIdentifier,
  getVariableFromName,
  isFunctionNode,
  isIdentifier,
  isMemberExpression,
} from '../utils';
import Variable = EsLintScope.Variable;
import Scope = EsLintScope.Scope;

// Types used in the hook declaration callback signature which reflects the expectations coming from the selector.

type HookDeclarator = estree.VariableDeclarator & {
  id: {
    elements: estree.Identifier[];
  };
  init: estree.CallExpression;
};

type SetterCall = estree.CallExpression & {
  callee: estree.Identifier;
};

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      noHookSetterInBody: 'Move the setState hook to the render function or body of a component',
    },
  },
  create(context: Rule.RuleContext) {
    const REACT_MODULE = 'react';
    const REACT_ROOT = 'React';
    const REACT_PATTERN = /^[^a-z]/;
    const HOOK_FUNCTION = 'useState';

    /**
     * Tells if a name comes from the 'react' module. It uses {@link getModuleNameOfImportedIdentifier()} to get the
     * module name. In the example below <code>isReactName(context, "useState")</code> will return true.
     * @example
     * import { useState } from "react";
     *
     * function ShowLanguageInvalid() {
     *   const [language, setLanguage] = useState('fr-FR');
     *   // [...]
     * }
     */
    function isReactName(identifier: estree.Identifier): boolean {
      const module = getModuleNameOfImportedIdentifier(context, identifier);
      return module?.value === REACT_MODULE;
    }

    /**
     * Check if a node or a string is a reference to the React <code>useState(value)</code> function. It can be used on:
     * <ul>
     *   <li>an Identifier
     *   <li>a member expression
     *   <li>a function call
     * </ul>
     */
    function isHookCall(node: estree.CallExpression): boolean {
      let identifier: estree.Identifier | undefined = undefined;
      if (isIdentifier(node.callee, HOOK_FUNCTION)) {
        identifier = node.callee;
      } else if (isMemberExpression(node.callee, REACT_ROOT, HOOK_FUNCTION)) {
        identifier = (node.callee as estree.MemberExpression).property as estree.Identifier;
      }
      return identifier !== undefined && isReactName(identifier) && node.arguments.length === 1;
    }

    /**
     * Returns the current scope if it corresponds to a React component function or undefined otherwise.
     */
    function getReactComponentScope(): Scope | undefined {
      const scope = context.getScope();
      const isReact = isFunctionNode(scope.block) && matches(scope.block, REACT_PATTERN, 1);
      return isReact ? scope : undefined;
    }

    /**
     * Returns the closest enclosing scope of type function or undefined if there isn't any.
     */
    function isInsideFunction(scope: Scope | undefined): boolean {
      function functionScope(current: Scope | null): Scope | undefined {
        if (current === null) {
          return undefined;
        } else if (current.type === 'function') {
          return current;
        } else {
          return functionScope(current.upper);
        }
      }

      return scope !== undefined && functionScope(context.getScope()) === scope;
    }

    let reactComponentScope: Scope | undefined; // Scope of the React component render function.
    const setters: Variable[] = []; // Setter variables returned by the React useState() function.

    return {
      ':function'() {
        reactComponentScope ??= getReactComponentScope(); // Store the top-most React component scope.
      },

      ':function:exit'() {
        if (context.getScope() === reactComponentScope) {
          // Clean variables when leaving the React component scope.
          reactComponentScope = undefined;
          setters.length = 0;
        }
      },

      // Selector matching declarations like: const [count, setCount] = useState(0);
      ['VariableDeclarator[init.type="CallExpression"]' +
        ':has(ArrayPattern[elements.length=2][elements.0.type="Identifier"][elements.1.type="Identifier"])'](
        node: estree.VariableDeclarator,
      ) {
        if (!isInsideFunction(reactComponentScope)) {
          return;
        }

        const hookDeclarator = node as HookDeclarator;

        if (isHookCall(hookDeclarator.init)) {
          const variable = getVariableFromName(context, hookDeclarator.id.elements[1].name);
          if (variable !== undefined) {
            setters.push(variable);
          }
        }
      },

      // Selector matching function calls like: setCount(1)
      'CallExpression[callee.type="Identifier"][arguments.length=1]'(node: estree.CallExpression) {
        if (!isInsideFunction(reactComponentScope) || setters.length === 0) {
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

/**
 * Check if the node is an eslint Rule.Node that's to say it has a parent property.
 */
function isRuleNode(node: estree.Node): node is Rule.Node {
  return (node as any).parent !== undefined;
}

/**
 * Check if a node matches a regular expression. It supports:
 * <ul>
 *   <li>Identifier: it uses the name
 *   <li>FunctionDeclaration: it uses the id.
 *   <li>VariableDeclarator: it uses the id.
 *   <li>AssignmentExpression: it uses the left part.
 *   <li>MemberExpression: it uses the property part.
 * </ul>
 * If the node is not supported calls itself recursively on the parent node up to max level.
 */
function matches(node: estree.Node | null, pattern: RegExp, max = 0): node is estree.Identifier {
  if (node == null) {
    return false;
  } else if (isIdentifier(node)) {
    return pattern.test(node.name);
  } else if (node.type === 'FunctionDeclaration') {
    return matches(node.id, pattern);
  } else if (node.type === 'VariableDeclarator') {
    return matches(node.id, pattern);
  } else if (node.type === 'AssignmentExpression') {
    return matches(node.left, pattern);
  } else if (node.type === 'MemberExpression') {
    return matches(node.property, pattern);
  } else if (isRuleNode(node) && max > 0) {
    return matches(node.parent, pattern, max - 1);
  } else {
    return false;
  }
}
