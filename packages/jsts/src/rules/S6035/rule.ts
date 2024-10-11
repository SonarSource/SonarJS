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
// https://sonarsource.github.io/rspec/#/rspec/S6035/javascript

import type { Rule } from 'eslint';
import { AST } from '@eslint-community/regexpp';
import { Alternation, createRegExpRule } from '../helpers/regex/index.js';
import { generateMeta } from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = createRegExpRule(
  context => {
    function checkAlternation(alternation: Alternation) {
      const { alternatives } = alternation;
      if (alternatives.length <= 1) {
        return;
      }
      if (
        alternatives.every(alt => alt.elements.length === 1 && alt.elements[0].type === 'Character')
      ) {
        context.reportRegExpNode({
          message: 'Replace this alternation with a character class.',
          node: context.node,
          regexpNode: alternation,
        });
      }
    }
    return {
      onPatternEnter: checkAlternation,
      onGroupEnter: checkAlternation,
      onCapturingGroupEnter: checkAlternation,
      onAssertionEnter(node: AST.Assertion) {
        if (node.kind === 'lookahead' || node.kind === 'lookbehind') {
          checkAlternation(node as Alternation);
        }
      },
    };
  },
  generateMeta(meta as Rule.RuleMetaData),
);
