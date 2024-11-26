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
// https://sonarsource.github.io/rspec/#/rspec/S3798/javascript
import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta, isIdentifier } from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      defineLocally:
        'Define this declaration in a local scope or bind explicitly the property to the global object.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      Program(node: estree.Node) {
        const scope = context.sourceCode.getScope(node);
        // As we parse every file with "module" source type, we find user defined global variables in the module scope
        const moduleScope = findModuleScope(context);
        moduleScope?.variables.forEach(variable => {
          if (scope.variables.find(global => global.name === variable.name)) {
            // Avoid reporting on redefinitions of actual global variables
            return;
          }
          for (const def of variable.defs) {
            const defNode = def.node;
            if (
              def.type === 'FunctionName' ||
              (def.type === 'Variable' && def.parent?.kind === 'var' && !isRequire(def.node.init))
            ) {
              context.report({
                node: defNode,
                messageId: 'defineLocally',
              });
              return;
            }
          }
        });
      },
    };
  },
};

function findModuleScope(context: Rule.RuleContext) {
  return context.sourceCode.scopeManager.scopes.find(s => s.type === 'module');
}

function isRequire(node: estree.Node | null | undefined) {
  return (
    node?.type === 'CallExpression' &&
    node.arguments.length === 1 &&
    isIdentifier(node.callee, 'require')
  );
}
