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
// https://sonarsource.github.io/rspec/#/rspec/S7923/css
import stylelint, { type PostcssResult } from 'stylelint';
import type PostCSS from 'postcss';
import colors from 'color-name';

const ruleName = 'sonar/no-contrast';

// exported for testing purpose
export const messages = {
  contrast: 'Text does not meet the minimal contrast requirement with its background.',
};

const ruleImpl: stylelint.RuleBase = () => {
  return (root: PostCSS.Root, _result: PostcssResult) => {
    root.walkDecls((_decl: PostCSS.Declaration) => {
      console.log('decl', _decl);
      if (_decl.value in colors) {
        const color = colors[_decl.value as keyof typeof colors];
        console.log('color', color);
      }
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
