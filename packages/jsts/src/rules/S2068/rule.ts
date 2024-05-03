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
// https://sonarsource.github.io/rspec/#/rspec/S2068/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { isStringLiteral } from '../helpers';
import path from 'path';
import type { RuleModule } from '../../../../shared/src/types/rule';

export type Options = [
  {
    credentialWords: Array<string>;
  },
];

export const rule: RuleModule<Options> = {
  meta: {
    messages: {
      reviewCredential: 'Review this potentially hardcoded credential.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          credentialWords: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      },
    ],
  },
  create(context: Rule.RuleContext) {
    const dir = path.dirname(context.physicalFilename);
    const parts = dir.split(path.sep).map(part => part.toLowerCase());
    if (parts.includes('l10n')) {
      return {};
    }

    const [{ credentialWords: variableNames }] = context.options as Options;
    const literalRegExp = variableNames.map(name => new RegExp(`${name}=.+`));
    return {
      VariableDeclarator: (node: estree.Node) => {
        const declaration = node as estree.VariableDeclarator;
        checkAssignment(context, variableNames, declaration.id, declaration.init);
      },
      AssignmentExpression: (node: estree.Node) => {
        const assignment = node as estree.AssignmentExpression;
        checkAssignment(context, variableNames, assignment.left, assignment.right);
      },
      Property: (node: estree.Node) => {
        const property = node as estree.Property;
        checkAssignment(context, variableNames, property.key, property.value);
      },
      Literal: (node: estree.Node) => {
        const literal = node as estree.Literal;
        checkLiteral(context, literalRegExp, literal);
      },
    };
  },
};

function checkAssignment(
  context: Rule.RuleContext,
  patterns: string[],
  variable: estree.Node,
  initializer?: estree.Node | null,
) {
  if (
    initializer &&
    isStringLiteral(initializer) &&
    (initializer.value as string).length > 0 &&
    patterns.some(pattern => context.sourceCode.getText(variable).includes(pattern))
  ) {
    context.report({
      messageId: 'reviewCredential',
      node: initializer,
    });
  }
}

function checkLiteral(context: Rule.RuleContext, patterns: RegExp[], literal: estree.Literal) {
  if (isStringLiteral(literal) && patterns.some(pattern => pattern.test(literal.value as string))) {
    context.report({
      messageId: 'reviewCredential',
      node: literal,
    });
  }
}
