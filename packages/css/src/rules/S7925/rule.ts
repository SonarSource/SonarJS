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
// https://sonarsource.github.io/rspec/#/rspec/S7925/css

import stylelint, { type PostcssResult } from 'stylelint';
import type PostCSS from 'postcss';

const ruleName = 'sonar/text-spacing';

function message(property: string) {
  return `Remove '!important' from ${property} to allow accessibility adjustments.`;
}

export const messages = {
  'word-spacing': message('word-spacing'),
  'letter-spacing': message('letter-spacing'),
  'line-height': message('line-height'),
};

const ruleImpl: stylelint.RuleBase = () => {
  return (root: PostCSS.Root, result: PostcssResult) => {
    root.walkDecls((decl: PostCSS.Declaration) => {
      let property = decl.prop.toLowerCase().trim();

      if (!Object.keys(messages).includes(property)) {
        return;
      }

      if (!decl.important) {
        return;
      }

      stylelint.utils.report({
        ruleName,
        result,
        message: messages[property as keyof typeof messages],
        node: decl,
      });
    });
  };
};

export const rule = stylelint.createPlugin(
  ruleName,
  Object.assign(ruleImpl, {
    messages,
    ruleName,
  }),
) as { ruleName: string; rule: stylelint.Rule };
