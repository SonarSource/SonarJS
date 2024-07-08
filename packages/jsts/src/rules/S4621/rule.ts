/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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

import { Rule, AST } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/utils';
import { SONAR_RUNTIME } from '../../linter/parameters';
import { generateMeta } from '../helpers/generate-meta';
import rspecMeta from './meta.json';
import { IssueLocation, report, toSecondaryLocation } from '../helpers';

export const rule: Rule.RuleModule = {
  meta: generateMeta(rspecMeta as Rule.RuleMetaData, {
    hasSuggestions: true,
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: [SONAR_RUNTIME],
      },
    ],
  }),

  create(context: Rule.RuleContext) {
    return {
      'TSUnionType, TSIntersectionType'(node: estree.Node) {
        const sourceCode = context.sourceCode;
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
            const secondaryLocations: IssueLocation[] = duplicates.map((node, index) =>
              toSecondaryLocation(node, index ? 'Another duplicate' : 'Original'),
            );

            report(
              context,
              {
                message: `Remove this duplicated type or replace with another one.`,
                loc: primaryNode.loc,
                suggest,
              },
              secondaryLocations,
            );
          }
        });
      },
    };
  },
};

function getSuggestions(
  composite: TSESTree.TSUnionType | TSESTree.TSIntersectionType,
  duplicates: TSESTree.Node[],
  context: Rule.RuleContext,
): Rule.SuggestionReportDescriptor[] {
  const ranges: [number, number][] = duplicates.slice(1).map(duplicate => {
    const idx = composite.types.indexOf(duplicate as TSESTree.TypeNode);
    return [
      getEnd(context, composite.types[idx - 1], composite),
      getEnd(context, duplicate, composite),
    ];
  });
  return [
    {
      desc: 'Remove duplicate types',
      fix: fixer => ranges.map(r => fixer.removeRange(r)),
    },
  ];
}

function getEnd(context: Rule.RuleContext, node: TSESTree.Node, composite: TSESTree.Node) {
  let end: estree.Node | AST.Token = node as unknown as estree.Node;
  while (true) {
    const nextToken: AST.Token | null = context.sourceCode.getTokenAfter(end);
    if (nextToken && nextToken.value === ')' && nextToken.range[1] <= composite.range[1]) {
      end = nextToken;
    } else {
      break;
    }
  }
  return end.range![1];
}
