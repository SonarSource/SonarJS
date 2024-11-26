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
// https://sonarsource.github.io/rspec/#/rspec/S6323/javascript

import type { Rule } from 'eslint';
import * as regexpp from '@eslint-community/regexpp';
import { generateMeta, last } from '../helpers/index.js';
import { meta } from './meta.js';
import { createRegExpRule } from '../helpers/regex/rule-template.js';
import type { Alternation } from '../helpers/regex/alternation.js';

export const rule: Rule.RuleModule = createRegExpRule(
  context => {
    function checkAlternation(alternation: Alternation) {
      const { alternatives: alts } = alternation;
      if (alts.length <= 1) {
        return;
      }
      for (let i = 0; i < alts.length; i++) {
        const alt = alts[i];
        if (alt.elements.length === 0 && !isLastEmptyInGroup(alt)) {
          context.reportRegExpNode({
            message: 'Remove this empty alternative.',
            regexpNode: alt,
            offset: i === alts.length - 1 ? [-1, 0] : [0, 1], // we want to raise the issue on the |
            node: context.node,
          });
        }
      }
    }

    return {
      onPatternEnter: checkAlternation,
      onGroupEnter: checkAlternation,
      onCapturingGroupEnter: checkAlternation,
    };
  },
  generateMeta(meta as Rule.RuleMetaData),
);

function isLastEmptyInGroup(alt: regexpp.AST.Alternative) {
  const group = alt.parent;
  return (
    (group.type === 'Group' || group.type === 'CapturingGroup') &&
    last(group.alternatives) === alt &&
    group.parent.type !== 'Quantifier'
  );
}
