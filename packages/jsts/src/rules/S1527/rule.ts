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
// https://sonarsource.github.io/rspec/#/rspec/S1527/javascript

import { Rule, Scope } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/index.js';
import * as meta from './generated-meta.js';

const futureReservedWords = new Set([
  'implements',
  'interface',
  'package',
  'private',
  'protected',
  'public',
  'enum',
  'class',
  'const',
  'export',
  'extends',
  'import',
  'super',
  'let',
  'static',
  'yield',
  'await',
]);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      renameReserved:
        'Rename "{{reserved}}" identifier to prevent potential conflicts with future evolutions of the JavaScript language.',
    },
  }),
  create(context: Rule.RuleContext) {
    function checkVariable(variable: Scope.Variable) {
      if (variable.defs.length > 0) {
        const def = variable.defs[0].name;
        context.report({
          node: def,
          messageId: 'renameReserved',
          data: {
            reserved: variable.name,
          },
        });
      }
    }

    function checkVariablesByScope(scope: Scope.Scope) {
      for (const variable of scope.variables.filter(v => futureReservedWords.has(v.name))) {
        checkVariable(variable);
      }

      for (const childScope of scope.childScopes) {
        checkVariablesByScope(childScope);
      }
    }

    return {
      'Program:exit': (node: estree.Node) => {
        checkVariablesByScope(context.sourceCode.getScope(node));
      },
    };
  },
};
