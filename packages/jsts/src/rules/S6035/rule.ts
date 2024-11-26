/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S6035/javascript

import type { Rule } from 'eslint';
import { AST } from '@eslint-community/regexpp';
import { generateMeta } from '../helpers/index.js';
import { meta } from './meta.js';
import { createRegExpRule } from '../helpers/regex/rule-template.js';
import type { Alternation } from '../helpers/regex/alternation.js';

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
