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
// https://sonarsource.github.io/rspec/#/rspec/S6331/javascript

import { Rule } from 'eslint';
import { AST } from '@eslint-community/regexpp';
import { createRegExpRule } from '../helpers/regex/index.js';
import { generateMeta } from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = createRegExpRule(
  context => {
    function checkEmptyGroup(group: AST.Group | AST.CapturingGroup) {
      const { alternatives } = group;
      if (alternatives.every(alt => alt.elements.length === 0)) {
        context.reportRegExpNode({
          message: 'Remove this empty group.',
          node: context.node,
          regexpNode: group,
        });
      }
    }
    return {
      onGroupEnter: checkEmptyGroup,
      onCapturingGroupEnter: checkEmptyGroup,
    };
  },
  generateMeta(meta as Rule.RuleMetaData),
);
