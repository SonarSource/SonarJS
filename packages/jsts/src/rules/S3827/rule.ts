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
// https://sonarsource.github.io/rspec/#/rspec/S3827/javascript
import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import estree from 'estree';
import {
  findFirstMatchingAncestor,
  generateMeta,
  isInsideVueSetupScript,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

// https://vuejs.org/api/sfc-script-setup.html#defineprops-defineemits
const vueMacroNames = new Set([
  'defineProps',
  'defineEmits',
  'defineExpose',
  'defineOptions',
  'defineSlots',
  'withDefaults',
]);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
  create(context: Rule.RuleContext) {
    const excludedNames = new Set();
    const undeclaredIdentifiersByName: Map<string, estree.Identifier[]> = new Map();
    return {
      'Program:exit'(node: estree.Node) {
        excludedNames.clear();
        undeclaredIdentifiersByName.clear();
        const globalScope = context.sourceCode.getScope(node);
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
          report(
            context,
            {
              node: identifiers[0],
              message: `"${name}" does not exist. Change its name or declare it so that its usage doesn't result in a "ReferenceError".`,
            },
            identifiers.slice(1).map(node => toSecondaryLocation(node)),
          );
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
