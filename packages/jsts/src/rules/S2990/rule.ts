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
// https://sonarsource.github.io/rspec/#/rspec/S2990/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta } from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    hasSuggestions: true,
    messages: {
      removeThis: `Remove the use of "this".`,
      suggestRemoveThis: 'Remove "this"',
      suggestUseWindow: 'Replace "this" with "window" object',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      'MemberExpression[object.type="ThisExpression"]'(node: estree.Node) {
        const memberExpression = node as estree.MemberExpression;
        const scopeType = context.sourceCode.getScope(node).variableScope.type;
        const isInsideClass = context.sourceCode
          .getAncestors(node)
          .some(
            ancestor => ancestor.type === 'ClassDeclaration' || ancestor.type === 'ClassExpression',
          );
        if ((scopeType === 'global' || scopeType === 'module') && !isInsideClass) {
          const suggest: Rule.SuggestionReportDescriptor[] = [];
          if (!memberExpression.computed) {
            const propertyText = context.sourceCode.getText(memberExpression.property);
            suggest.push(
              {
                messageId: 'suggestRemoveThis',
                fix: fixer => fixer.replaceText(node, propertyText),
              },
              {
                messageId: 'suggestUseWindow',
                fix: fixer => fixer.replaceText(memberExpression.object, 'window'),
              },
            );
          }
          context.report({
            messageId: 'removeThis',
            node: memberExpression.object,
            suggest,
          });
        }
      },
    };
  },
};
