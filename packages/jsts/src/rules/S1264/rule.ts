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
// https://sonarsource.github.io/rspec/#/rspec/S1264

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/index.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      replaceForWithWhileLoop: 'Replace this "for" loop with a "while" loop.',
    },
  }),
  create(context) {
    return {
      ForStatement(forLoop: estree.ForStatement) {
        const forKeyword = context.sourceCode.getFirstToken(forLoop);
        if (!forLoop.init && !forLoop.update && forLoop.test && forKeyword) {
          context.report({
            messageId: `replaceForWithWhileLoop`,
            loc: forKeyword.loc,
            fix: getFix(forLoop),
          });
        }
      },
    };

    function getFix(forLoop: estree.ForStatement): Rule.ReportFixer | undefined {
      const forLoopRange = forLoop.range;
      const closingParenthesisToken = context.sourceCode.getTokenBefore(forLoop.body);
      const condition = forLoop.test;

      if (condition && forLoopRange && closingParenthesisToken) {
        return (fixer: Rule.RuleFixer) => {
          const start = forLoopRange[0];
          const end = closingParenthesisToken.range[1];
          const conditionText = context.sourceCode.getText(condition);
          return fixer.replaceTextRange([start, end], `while (${conditionText})`);
        };
      }

      return undefined;
    }
  },
};
