/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-2068

import { Rule } from 'eslint';
import * as estree from 'estree';

const MESSAGE = 'Review this potentially hardcoded credential.';

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const variableNames = context.options;
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
    patterns.some(pattern => context.getSourceCode().getText(variable).includes(pattern))
  ) {
    context.report({
      message: MESSAGE,
      node: initializer,
    });
  }
}

function checkLiteral(context: Rule.RuleContext, patterns: RegExp[], literal: estree.Literal) {
  if (isStringLiteral(literal) && patterns.some(pattern => pattern.test(literal.value as string))) {
    context.report({
      message: MESSAGE,
      node: literal,
    });
  }
}

function isStringLiteral(node: estree.Node): node is estree.Literal {
  return node.type === 'Literal' && typeof node.value === 'string';
}
