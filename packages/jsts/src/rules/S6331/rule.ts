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
// https://sonarsource.github.io/rspec/#/rspec/S6331/javascript

import type { Rule } from 'eslint';
import { AST } from '@eslint-community/regexpp';
import { createRegExpRule } from '../helpers/regex/rule-template.js';
import { generateMeta } from '../helpers/generate-meta.js';
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
