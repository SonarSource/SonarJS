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
// https://sonarsource.github.io/rspec/#/rspec/S5842/javascript

import type { Rule } from 'eslint';
import { Node, Quantifier } from '@eslint-community/regexpp/ast';
import { createRegExpRule } from '../helpers/regex/index.js';
import { generateMeta } from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = createRegExpRule(
  context => {
    return {
      onQuantifierEnter: (node: Quantifier) => {
        const { element } = node;
        if (matchEmptyString(element)) {
          context.reportRegExpNode({
            message: `Rework this part of the regex to not match the empty string.`,
            node: context.node,
            regexpNode: element,
          });
        }
      },
    };
  },
  generateMeta(meta as Rule.RuleMetaData),
);

function matchEmptyString(node: Node): boolean {
  switch (node.type) {
    case 'Alternative':
      return node.elements.every(matchEmptyString);
    case 'Assertion':
      return true;
    case 'CapturingGroup':
    case 'Group':
    case 'Pattern':
      return node.alternatives.some(matchEmptyString);
    case 'Quantifier':
      return node.min === 0;
    default:
      return false;
  }
}
