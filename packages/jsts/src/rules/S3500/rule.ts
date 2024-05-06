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
// https://sonarsource.github.io/rspec/#/rspec/S3500/javascript

import { Rule, Scope } from 'eslint';
import * as estree from 'estree';
import { toEncodedMessage } from '../helpers';
import { SONAR_RUNTIME } from '../../linter/parameters';

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: [SONAR_RUNTIME],
      },
    ],
  },
  create(context: Rule.RuleContext) {
    return {
      'VariableDeclaration[kind="const"]': (node: estree.Node) => {
        context.sourceCode.getDeclaredVariables(node).forEach(variable =>
          variable.references.filter(isModifyingReference).forEach(reference =>
            context.report({
              message: toEncodedMessage(
                `Correct this attempt to modify "${reference.identifier.name}" or use "let" in its declaration.`,
                [node],
                ['Const declaration'],
              ),
              node: reference.identifier,
            }),
          ),
        );
      },
    };
  },
};

function isModifyingReference(
  reference: Scope.Reference,
  index: number,
  references: Scope.Reference[],
) {
  const identifier = reference.identifier;
  const modifyingDifferentIdentifier =
    index === 0 || references[index - 1].identifier !== identifier;
  return (
    identifier && reference.init === false && reference.isWrite() && modifyingDifferentIdentifier
  );
}
