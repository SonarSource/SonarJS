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
// https://sonarsource.github.io/rspec/#/rspec/S101/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/utils';
import type { RuleModule } from '../../../../shared/src/types/rule';

type ClassOrInterfaceDeclaration = TSESTree.ClassDeclaration | TSESTree.TSInterfaceDeclaration;

export type Options = [
  {
    format: string;
  },
];

export const rule: RuleModule<Options> = {
  meta: {
    messages: {
      renameClass: 'Rename {{symbolType}} "{{symbol}}" to match the regular expression {{format}}.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          format: {
            type: 'string',
          },
        },
      },
    ],
  },
  create(context: Rule.RuleContext) {
    return {
      ClassDeclaration: (node: estree.Node) =>
        checkName(node as ClassOrInterfaceDeclaration, 'class', context),
      TSInterfaceDeclaration: (node: estree.Node) =>
        checkName(node as ClassOrInterfaceDeclaration, 'interface', context),
    };
  },
};

function checkName(
  node: ClassOrInterfaceDeclaration,
  declarationType: string,
  context: Rule.RuleContext,
) {
  const [{ format }] = context.options;
  if (node.id) {
    const name = node.id.name;
    if (!name.match(format)) {
      context.report({
        messageId: 'renameClass',
        data: {
          symbol: name,
          symbolType: declarationType,
          format,
        },
        node: node.id,
      });
    }
  }
}
