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
// https://sonarsource.github.io/rspec/#/rspec/S4621/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { toEncodedMessage } from '../utils';

export const rule: Rule.RuleModule = {
  meta: {
    hasSuggestions: true,
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: ['sonar-runtime'],
      },
    ],
  },

  create(context: Rule.RuleContext) {
    return {
      'TSUnionType, TSIntersectionType'(node: estree.Node) {
        const sourceCode = context.getSourceCode();
        const compositeType = node as unknown as TSESTree.TSUnionType | TSESTree.TSIntersectionType;
        const groupedTypes: Map<string, Array<TSESTree.Node>> = new Map();

        compositeType.types.forEach(typescriptType => {
          const nodeValue = sourceCode.getText(typescriptType as unknown as estree.Node);
          const nodesWithGivenType = groupedTypes.get(nodeValue);
          const nodeType = typescriptType as TSESTree.Node;
          if (!nodesWithGivenType) {
            groupedTypes.set(nodeValue, [nodeType]);
          } else {
            nodesWithGivenType.push(nodeType);
          }
        });

        groupedTypes.forEach(duplicates => {
          if (duplicates.length > 1) {
            const suggest = getSuggestions(compositeType, duplicates, context);
            const primaryNode = duplicates.splice(1, 1)[0];
            const secondaryMessages = Array(duplicates.length);
            secondaryMessages[0] = `Original`;
            secondaryMessages.fill(`Another duplicate`, 1, duplicates.length);

            context.report({
              message: toEncodedMessage(
                `Remove this duplicated type or replace with another one.`,
                duplicates,
                secondaryMessages,
              ),
              loc: primaryNode.loc,
              suggest,
            });
          }
        });
      },
    };
  },
};

// function getSuggestions(
//   composite: TSESTree.TSUnionType | TSESTree.TSIntersectionType,
//   duplicates: TSESTree.Node[],
//   context: Rule.RuleContext,
// ): Rule.SuggestionReportDescriptor[] {
//   const duplications = duplicates.slice(1);
//   const uniqueTypes = composite.types.filter(tpe => !duplications.includes(tpe));
//   const uniqueTexts = uniqueTypes.map(tpe => {
//     const firstToken = context.getSourceCode().getTokenBefore(tpe as unknown as estree.Node);
//     const lastToken = context.getSourceCode().getTokenAfter(tpe as unknown as estree.Node);
//     let [prefix, suffix] = ['', ''];
//     if (firstToken?.value === '(' && lastToken?.value === ')') {
//       prefix = '(';
//       suffix = ')';
//     }
//     const tpeText = context.getSourceCode().getText(tpe as unknown as estree.Node);
//     return `${prefix}${tpeText}${suffix}`;
//   });
//   const compositeNode = composite as unknown as estree.Node;
//   const typeSeparator = composite.type === 'TSUnionType' ? ' | ' : ' & ';
//   return [
//     {
//       desc: 'Remove duplicate types',
//       fix: fixer => fixer.replaceText(compositeNode, uniqueTexts.join(typeSeparator)),
//     },
//   ];
// }

function getSuggestions(
  composite: TSESTree.TSUnionType | TSESTree.TSIntersectionType,
  duplicates: TSESTree.Node[],
  _context: Rule.RuleContext,
): Rule.SuggestionReportDescriptor[] {
  return [
    {
      desc: 'Remove duplicate types',
      fix: fixer =>
        duplicates.slice(1).map(duplicate => {
          const idx = composite.types.indexOf(duplicate as TSESTree.TypeNode);
          return fixer.removeRange([composite.types[idx - 1].range[1], duplicate.range[1]]);
        }),
    },
  ];
}
