/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S1481/javascript

import { Rule, Scope } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/index.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      unusedFunction: `Remove unused function '{{symbol}}'.`,
      unusedVariable: `Remove the declaration of the unused '{{symbol}}' variable.`,
    },
  }),
  create(context: Rule.RuleContext) {
    let toIgnore: estree.Identifier[] = [];
    let jsxComponentsToIgnore: string[] = [];

    function checkVariable(v: Scope.Variable, toCheck: 'let-const-function' | 'all') {
      if (v.defs.length === 0) {
        return;
      }
      const type = v.defs[0].type;
      if (type !== 'Variable' && type !== 'FunctionName') {
        return;
      }
      if (toCheck === 'let-const-function') {
        const def = v.defs[0];
        if (def.parent && def.parent.type === 'VariableDeclaration' && def.parent.kind === 'var') {
          return;
        }
      }

      const defs = v.defs.map(def => def.name);
      const unused = v.references.every(ref => defs.includes(ref.identifier));

      if (unused && !toIgnore.includes(defs[0]) && !jsxComponentsToIgnore.includes(v.name)) {
        const messageAndData =
          type === 'FunctionName'
            ? getUnusedFunctionMessageAndData(v.name)
            : getUnusedVariableMessageAndData(v.name);
        for (const def of defs) {
          context.report({
            node: def,
            ...messageAndData,
          });
        }
      }
    }

    function checkScope(
      scope: Scope.Scope,
      checkedInParent: 'nothing' | 'let-const-function' | 'all',
    ) {
      let toCheck = checkedInParent;
      if (scope.type === 'function' && !isParentOfModuleScope(scope)) {
        toCheck = 'all';
      } else if (checkedInParent === 'nothing' && scope.type === 'block') {
        toCheck = 'let-const-function';
      }

      if (toCheck !== 'nothing' && scope.type !== 'function-expression-name') {
        for (const v of scope.variables) {
          checkVariable(v, toCheck);
        }
      }

      for (const childScope of scope.childScopes) {
        checkScope(childScope, toCheck);
      }
    }

    return {
      ObjectPattern: (node: estree.Node) => {
        const elements = (node as estree.ObjectPattern).properties;
        const hasRest = elements.some(element => (element as any).type === 'RestElement');

        if (!hasRest) {
          return;
        }

        for (const element of elements) {
          if (
            element.type === 'Property' &&
            element.shorthand &&
            element.value.type === 'Identifier'
          ) {
            toIgnore.push(element.value);
          }
        }
      },

      JSXIdentifier: (node: estree.Node) => {
        // using 'any' as standard typings for AST don't provide types for JSX
        jsxComponentsToIgnore.push((node as any).name);
      },

      'Program:exit': (node: estree.Node) => {
        checkScope(context.sourceCode.getScope(node), 'nothing');
        toIgnore = [];
        jsxComponentsToIgnore = [];
      },
    };
  },
};

function isParentOfModuleScope(scope: Scope.Scope) {
  return scope.childScopes.some(s => s.type === 'module');
}

function getUnusedFunctionMessageAndData(name: string) {
  return { messageId: 'unusedFunction', data: { symbol: name } };
}

function getUnusedVariableMessageAndData(name: string) {
  return { messageId: 'unusedVariable', data: { symbol: name } };
}
