/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
import {
  contrast,
  getColorFromBackground,
  getColorFromString,
  isAlmostTransparent,
} from '../../helpers/color.js';

const ruleName = 'sonar/minimum-contrast';

// exported for testing purpose
export const messages = {
  contrast: 'Text does not meet the minimal contrast requirement with its background.',
};

const THRESHOLD = 4.5;

const ruleImpl: stylelint.RuleBase = () => {
  return (root: PostCSS.Root, result: PostcssResult) => {
    let textColor: number[] | undefined;
    let backgroundColor: number[] | undefined;
    let parent: PostCSS.Node | undefined;
    let issueRaised = false;
    root.walkDecls((decl: PostCSS.Declaration) => {
      if (decl.parent !== parent) {
        parent = decl.parent;
        textColor = undefined;
        backgroundColor = undefined;
        issueRaised = false;
      }
      if (issueRaised) {
        // we only want to report once per rule
        return;
      }

      if (decl.prop.toLowerCase() === 'color') {
        textColor = getColorFromString(decl.value);
      } else if (decl.prop.toLowerCase() === 'background-color') {
        backgroundColor = getColorFromString(decl.value);
      } else if (decl.prop.toLowerCase() === 'background') {
        backgroundColor = getColorFromBackground(decl.value);
      }
      if (!textColor || !backgroundColor) {
        return;
      }
      if (isAlmostTransparent(backgroundColor) || isAlmostTransparent(textColor)) {
        return;
      }
      if (contrast(backgroundColor, textColor) < THRESHOLD) {
        issueRaised = true;
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
