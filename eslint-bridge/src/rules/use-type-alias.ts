/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-4323

import { Rule } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { toEncodedMessage } from './utils';

const TYPE_THRESHOLD = 2;
const USAGE_THRESHOLD = 2;

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: ['sonar-runtime'],
      },
    ],
  },
  create(context: Rule.RuleContext) {
    let usage: Map<string, TSESTree.Node[]>;
    return {
      Program: () => (usage = new Map<string, TSESTree.Node[]>()),
      'Program:exit': () =>
        usage.forEach(nodes => {
          if (nodes.length > USAGE_THRESHOLD) {
            const [node, ...rest] = nodes;
            const kind = node.type === 'TSUnionType' ? 'union' : 'intersection';
            const message = toEncodedMessage(`Replace this ${kind} type with a type alias.`, rest);
            context.report({ message, loc: node.loc });
          }
        }),
      'TSUnionType, TSIntersectionType': (node: estree.Node) => {
        const ancestors = context.getAncestors();
        const declaration = ancestors.find(
          ancestor => (ancestor as TSESTree.Node).type === 'TSTypeAliasDeclaration',
        );
        if (!declaration) {
          const composite = (node as unknown) as TSESTree.TSUnionType | TSESTree.TSIntersectionType;
          if (composite.types.length > TYPE_THRESHOLD) {
            const text = composite.types
              .map(typeNode => context.getSourceCode().getText(typeNode as estree.Node))
              .sort((a, b) => a.localeCompare(b))
              .join('|');
            let occurrences = usage.get(text);
            if (!occurrences) {
              occurrences = [composite];
              usage.set(text, occurrences);
            } else {
              occurrences.push(composite);
            }
          }
        }
      },
    };
  },
};
