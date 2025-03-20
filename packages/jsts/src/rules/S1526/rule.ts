/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S1526/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta, report, toSecondaryLocation } from '../helpers/index.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),

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
