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
import Color from 'color-string';
import postcssValueParser from 'postcss-value-parser';

const ruleName = 'sonar/minimum-contrast';

// exported for testing purpose
export const messages = {
  contrast: 'Text does not meet the minimal contrast requirement with its background.',
};

const THRESHOLD = 4.5;

const ruleImpl: stylelint.RuleBase = () => {
  return (root: PostCSS.Root, result: PostcssResult) => {
    let textColor: number[] | null = null;
    let backgroundColor: number[] | null = null;
    root.walkDecls((decl: PostCSS.Declaration) => {
      console.log(decl.value);
      if (decl.prop.toLowerCase() === 'color') {
        textColor = Color.get.rgb(decl.value);
      } else if (decl.prop.toLowerCase() === 'background-color') {
        backgroundColor = Color.get.rgb(decl.value);
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

function getColorFromBackground(value: string) {
  let color: number[] | null = null;
  postcssValueParser(value).walk(node => {
    if (node.type === 'word' && !color) {
      color = Color.get.rgb(node.value);
    }
  });
  return color;
}

export const rule = stylelint.createPlugin(
  ruleName,
  Object.assign(ruleImpl, {
    messages,
    ruleName,
  }),
) as { ruleName: string; rule: stylelint.Rule };

/// https://stackoverflow.com/a/63270816
const RED = 0.2126;
const GREEN = 0.7152;
const BLUE = 0.0722;
const GAMMA = 2.4;

function luminance(...rgb: number[]) {
  const a = rgb.slice(0, 3).map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** GAMMA;
  });
  return a[0] * RED + a[1] * GREEN + a[2] * BLUE;
}

function contrast(rgb1: number[], rgb2: number[]) {
  const lum1 = luminance(...rgb1);
  const lum2 = luminance(...rgb2);
  const [brightest, darkest] = lum1 > lum2 ? [lum1, lum2] : [lum2, lum1];
  return (brightest + 0.05) / (darkest + 0.05);
}

console.log(contrast([255, 255, 255], [255, 255, 0])); // 1.074 for yellow
console.log(contrast([255, 255, 255], [0, 0, 255])); // 8.592 for blue
