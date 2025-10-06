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
// https://sonarsource.github.io/rspec/#/rspec/S7924/css

import stylelint, { type PostcssResult } from 'stylelint';
import type PostCSS from 'postcss';
import { contrast, getColorFromBackground, getColorFromString } from '../../helpers/color.js';

const ruleName = 'sonar/minimum-contrast';

// exported for testing purpose
export const messages = {
  contrast: 'Text does not meet the minimal contrast requirement with its background.',
};

const THRESHOLD = 4.5;

const ruleImpl: stylelint.RuleBase = () => {
  return (root: PostCSS.Root, result: PostcssResult) => {
    let textColor: number[] | undefined = undefined;
    let backgroundColor: number[] | undefined = undefined;
    let parent: PostCSS.Node | undefined = undefined;
    root.walkDecls((decl: PostCSS.Declaration) => {
      if (decl.parent !== parent) {
        parent = decl.parent;
        textColor = undefined;
        backgroundColor = undefined;
      }
      if (decl.prop.toLowerCase() === 'color') {
        textColor = getColorFromString(decl.value);
      } else if (decl.prop.toLowerCase() === 'background-color') {
        backgroundColor = getColorFromString(decl.value);
      } else if (decl.prop.toLowerCase() === 'background') {
        backgroundColor = getColorFromBackground(decl.value);
      }
      if (backgroundColor && textColor && contrast(backgroundColor, textColor) < THRESHOLD) {
        stylelint.utils.report({
          ruleName,
          result,
          message: messages.contrast,
          node: decl,
        });
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
