/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S8786/javascript

import type { Rule } from 'eslint';
import type { AST } from '@eslint-community/regexpp';
import { analyse } from 'scslre';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';
import { createRegExpRule } from '../helpers/regex/rule-template.js';

const message = `Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking.`;

export const rule: Rule.RuleModule = createRegExpRule(context => {
  return {
    onRegExpLiteralEnter: (node: AST.RegExpLiteral) => {
      let reports;
      try {
        ({ reports } = analyse(node));
      } catch {
        return;
      }
      if (reports.some(r => !r.exponential)) {
        context.report({
          message,
          node: context.node,
        });
      }
    },
  };
}, generateMeta(meta));
