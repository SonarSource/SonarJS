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
// https://sonarsource.github.io/rspec/#/rspec/S2077/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import {
  generateMeta,
  isMemberWithProperty,
  isRequireModule,
  isIdentifier,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

const templatingModules: Record<string, string[]> = {
  pug: ['compile', 'render'],
  ejs: ['compile', 'render'],
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      safeQuery: `Make sure this dynamically formatted template is safe here.`,
    },
  }),
  create(context: Rule.RuleContext) {
    let isTemplateModuleImported = false;
    const importedModules = new Set<string>();

    function isSensitiveIdentifier(callee: estree.Expression | estree.Super) {
      for (const moduleName of importedModules) {
        const functions = templatingModules[moduleName];
        for (const func of functions) {
          if (isMemberWithProperty(callee, func) || isIdentifier(callee, func)) {
            return true;
          }
        }
      }
      return false;
    }

    return {
      Program() {
        isTemplateModuleImported = false;
      },

      ImportDeclaration(node: estree.Node) {
        const { source } = node as estree.ImportDeclaration;
        if (Object.keys(templatingModules).includes(String(source.value))) {
          isTemplateModuleImported = true;
          importedModules.add(String(source.value));
        }
      },

      CallExpression(node: estree.Node) {
        const call = node as estree.CallExpression;
        const { callee, arguments: args } = call;

        if (isRequireModule(call, ...Object.keys(templatingModules))) {
          isTemplateModuleImported = true;
          const moduleName = (args[0] as estree.Literal).value as string;
          importedModules.add(moduleName);
          return;
        }

        if (isTemplateModuleImported && isSensitiveIdentifier(callee) && isQuestionable(args[0])) {
          context.report({
            messageId: 'safeQuery',
            node: callee,
          });
        }
      },
    };
  },
};

type Argument = estree.Expression | estree.SpreadElement;

function isQuestionable(templateString: Argument | undefined) {
  if (!templateString) {
    return false;
  }
  if (isTemplateWithVar(templateString)) {
    return true;
  }
  if (isConcatenation(templateString)) {
    return isVariableConcat(templateString);
  }
  return (
    templateString.type === 'CallExpression' &&
    isMemberWithProperty(templateString.callee, 'concat', 'replace')
  );
}

function isVariableConcat(node: estree.BinaryExpression): boolean {
  const { left, right } = node;
  if (!isHardcodedLiteral(right)) {
    return true;
  }
  if (isConcatenation(left)) {
    return isVariableConcat(left);
  }
  return !isHardcodedLiteral(left);
}

function isTemplateWithVar(node: estree.Node) {
  return node.type === 'TemplateLiteral' && node.expressions.length !== 0;
}

function isTemplateWithoutVar(node: estree.Node) {
  return node.type === 'TemplateLiteral' && node.expressions.length === 0;
}

function isConcatenation(node: estree.Node): node is estree.BinaryExpression {
  return node.type === 'BinaryExpression' && node.operator === '+';
}

function isHardcodedLiteral(node: estree.Node) {
  return node.type === 'Literal' || isTemplateWithoutVar(node);
}
