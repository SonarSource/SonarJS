/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S3827/javascript
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { Rule } from 'eslint';
import * as estree from 'estree';
import { findFirstMatchingAncestor, toEncodedMessage, isInsideVueSetupScript } from '../helpers';
import { SONAR_RUNTIME } from '../../linter/parameters';

const vueMacroNames = new Set([
  'defineProps',
  'defineEmits',
  'defineExpose',
  'defineOptions',
  'defineSlots',
]);

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
    const excludedNames = new Set();
    const undeclaredIdentifiersByName: Map<string, estree.Identifier[]> = new Map();
    return {
      'Program:exit'() {
        excludedNames.clear();
        undeclaredIdentifiersByName.clear();
        const globalScope = context.getScope();
        globalScope.through.forEach(ref => {
          const identifier = ref.identifier;
          if (excludedNames.has(identifier.name)) {
            return;
          }
          if (
            ref.writeExpr ||
            hasTypeOfOperator(identifier as TSESTree.Node) ||
            isWithinWithStatement(identifier as TSESTree.Node)
          ) {
            excludedNames.add(identifier.name);
            return;
          }
          if (vueMacroNames.has(identifier.name) && isInsideVueSetupScript(identifier, context)) {
            return;
          }
          const undeclaredIndentifiers = undeclaredIdentifiersByName.get(identifier.name);
          if (undeclaredIndentifiers) {
            undeclaredIndentifiers.push(identifier);
          } else {
            undeclaredIdentifiersByName.set(identifier.name, [identifier]);
          }
        });
        undeclaredIdentifiersByName.forEach((identifiers, name) => {
          context.report({
            node: identifiers[0],
            message: toEncodedMessage(
              `"${name}" does not exist. Change its name or declare it so that its usage doesn't result in a "ReferenceError".`,
              identifiers.slice(1),
            ),
          });
        });
      },
    };
  },
};

function isWithinWithStatement(node: TSESTree.Node) {
  return !!findFirstMatchingAncestor(node, ancestor => ancestor.type === 'WithStatement');
}

function hasTypeOfOperator(node: TSESTree.Node) {
  const parent = node.parent;
  return parent?.type === 'UnaryExpression' && parent.operator === 'typeof';
}
