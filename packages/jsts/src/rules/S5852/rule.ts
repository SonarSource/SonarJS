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
// https://sonarsource.github.io/rspec/#/rspec/S5852/javascript

import type { Rule } from 'eslint';
import { RegExpLiteral } from '@eslint-community/regexpp/ast';
import { analyse } from 'scslre';
import { generateMeta } from '../helpers/index.js';
import { meta } from './meta.js';
import { createRegExpRule } from '../helpers/regex/rule-template.js';

const message = `Make sure the regex used here, which is vulnerable to super-linear runtime due to backtracking, cannot lead to denial of service.`;

export const rule: Rule.RuleModule = createRegExpRule(
  context => {
    return {
      onRegExpLiteralEnter: (node: RegExpLiteral) => {
        const { reports } = analyse(node);
        if (reports.length > 0) {
          context.report({
            message,
            node: context.node,
          });
        }
      },
    };
  },
  generateMeta(meta as Rule.RuleMetaData),
);
