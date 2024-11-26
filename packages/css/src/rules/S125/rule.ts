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
// https://sonarsource.github.io/rspec/#/rspec/S125/css

import pkg from 'stylelint';
const { createPlugin, utils } = pkg;
import { parse } from 'postcss';

const ruleName = 'sonar/no-commented-code';
const messages = { commentedCode: 'Remove this commented out code.' };

const ruleImpl: pkg.RuleBase = () => {
  return (root: any, result: any) => {
    root.walkComments((comment: any) => {
      const { text } = comment;
      if (isLikelyCss(text)) {
        try {
          parse(text);
          utils.report({
            ruleName,
            result,
            message: messages.commentedCode,
            node: comment,
          });
        } catch {
          /* syntax error */
        }
      }
    });
  };

  function isLikelyCss(text: string) {
    // Regular expression to match CSS selectors, properties, and values
    // `<selector(s)> '{' <anything> '}'`
    const ruleRegex = /([a-z0-9\s,.\-#:_]+)\{([^}]*)\}/i;

    // Regular expression to match CSS declarations
    // `<property> ':' <value> ';'`
    const declRegex = /([a-z-]+)\s*:\s*([^;]+);/i;

    // Regular expression to match CSS at-rules
    // `'@' <at-rule> '(' <anything> ')'`
    const atRuleRegex = /@([a-z-]*)\s*([^;{]*)(;|(\{([^}]*)\}))/i;

    // Test the text against the regular expressions
    return ruleRegex.test(text) || declRegex.test(text) || atRuleRegex.test(text);
  }
};

export const rule = createPlugin(
  ruleName,
  Object.assign(ruleImpl, {
    messages,
    ruleName,
  }),
) as { ruleName: string; rule: pkg.Rule };
