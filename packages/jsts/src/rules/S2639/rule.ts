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
// https://sonarsource.github.io/rspec/#/rspec/S2639/javascript

import type { Rule } from 'eslint';
import { CharacterClass } from '@eslint-community/regexpp/ast';
import { generateMeta } from '../helpers/index.js';
import { meta } from './meta.js';
import { createRegExpRule } from '../helpers/regex/rule-template.js';

export const rule: Rule.RuleModule = createRegExpRule(
  context => {
    return {
      onCharacterClassEnter: (node: CharacterClass) => {
        if (node.elements.length === 0 && !node.negate) {
          context.reportRegExpNode({
            messageId: 'issue',
            node: context.node,
            regexpNode: node,
          });
        }
      },
    };
  },
  generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      issue: "Rework this empty character class that doesn't match anything.",
    },
  }),
);
