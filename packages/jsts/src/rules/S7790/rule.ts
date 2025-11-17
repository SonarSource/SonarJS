/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
// https://sonarsource.github.io/rspec/#/rspec/S7790/javascript

import { Rule } from 'eslint';
import { generateMeta, isIdentifier, isMemberWithProperty } from '../helpers/index.js';
import estree from 'estree';
import * as meta from './generated-meta.js';

const messages = {
  safeCode: `Make sure executing a dynamically formatted template is safe here.`,
};

const TEMPLATING_MODULES = new Set(['pug']);
const COMPILATION_FUNCTIONS = new Set(['compile']);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    const importedPugIdentifiers = new Set<string>();

    function isCompilationFunction(callee: estree.Expression | estree.Super): boolean {
      return COMPILATION_FUNCTIONS.some(
        func => isMemberWithProperty(callee, func) || isIdentifier(callee, func),
      );
    }

    function checkCallExpression(node: estree.CallExpression, context: Rule.RuleContext) {
      if (
        isCompilationFunction(node.callee) &&
        importedPugIdentifiers.has(node.callee.object.name)
      ) {
        checkArguments(node, context);
      }
    }

    function checkNewExpression(node: estree.NewExpression) {
      // Check for new Function() constructor
      if (node.callee.type === 'Identifier' && node.callee.name === 'Function') {
        checkArguments(node, context);
      }
    }

    function checkArguments(node: estree.CallExpression | estree.NewExpression) {
      if (hasAtLeastOneVariableArgument(node.arguments)) {
        context.report({
          messageId: 'safeCode',
          node: node.callee,
        });
      }
    }

    return {
      Program() {
        importedPugIdentifiers.clear();
      },

      ImportDeclaration(node: estree.ImportDeclaration) {
        if (typeof node.source.value === 'string' && TEMPLATING_MODULES.has(node.source.value)) {
          for (const specifier of node.specifiers) {
            if (
              specifier.type === 'ImportDefaultSpecifier' ||
              specifier.type === 'ImportNamespaceSpecifier' ||
              (specifier.type === 'ImportSpecifier' &&
                specifier.imported.type === 'Identifier' &&
                COMPILATION_FUNCTIONS.has(specifier.imported.name))
            ) {
              importedPugIdentifiers.add(specifier.local.name);
            }
          }
        }
      },

      CallExpression: (node: estree.Node) =>
        checkCallExpression(node as estree.CallExpression, context),

      NewExpression: (node: estree.Node) =>
        checkNewExpression(node as estree.NewExpression, context),
    };
  },
};

function hasAtLeastOneVariableArgument(args: Array<estree.Node>) {
  return args.some(arg => !isLiteral(arg));
}

function isLiteral(node: estree.Node): boolean {
  if (node.type === 'Literal') {
    return true;
  }

  if (node.type === 'TemplateLiteral') {
    return node.expressions.length === 0;
  }

  return false;
}
