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
// https://sonarsource.github.io/rspec/#/rspec/S1526/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { generateMeta, report, toSecondaryLocation } from '../helpers/index.ts';
import { meta } from './meta.ts';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, undefined, true),

  create(context: Rule.RuleContext) {
    return {
      "VariableDeclaration[kind='var']": (node: estree.Node) => {
        const variables = context.sourceCode.getDeclaredVariables(node);
        for (const variable of variables) {
          const declaration = variable.identifiers[0];
          const misused = variable.references
            .filter(reference => !reference.init && comesBefore(reference.identifier, declaration))
            .map(reference => reference.identifier);
          if (misused.length > 0) {
            report(
              context,
              {
                message: `Move the declaration of "${declaration.name}" before this usage.`,
                node: misused[0],
              },
              [toSecondaryLocation(declaration, 'Declaration')],
            );
          }
        }
      },
    };
  },
};

function comesBefore(node: estree.Node, other: estree.Node) {
  const nodeLine = line(node),
    otherLine = line(other);
  return nodeLine < otherLine || (nodeLine === otherLine && column(node) < column(other));
}

function line(node: estree.Node) {
  return node.loc!.start.line;
}

function column(node: estree.Node) {
  return node.loc!.start.column;
}
