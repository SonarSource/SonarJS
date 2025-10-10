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
import postcssValueParser from 'postcss-value-parser';

const ruleName = 'sonar/text-spacing';

function message(property: string) {
  return `Increase this value or remove '!important' from ${property} to allow accessibility adjustments.`;
}

const spaceRegex = /(?<spaceStr>-?\d+(?:\.\d+)?)(?<unit>r?(?:em|ex|ch|ic|cap)|%)?/i;

export const messages = {
  'word-spacing': message('word-spacing'),
  'letter-spacing': message('letter-spacing'),
  'line-height': message('line-height'),
};
const threshold = {
  'word-spacing': 0.16,
  'letter-spacing': 0.12,
  'line-height': 1.5,
};

const ruleImpl: stylelint.RuleBase = () => {
  return (root: PostCSS.Root, result: PostcssResult) => {
    root.walkDecls((decl: PostCSS.Declaration) => {
      const property = decl.prop.toLowerCase().trim();

      if (!isTargetedProperty(property)) {
        return;
      }

      if (!decl.important) {
        return;
      }

      let invalid = false;
      postcssValueParser(decl.value).walk((node: postcssValueParser.Node) => {
        if (node.type === 'word' && spaceRegex.test(node.value) && !invalid) {
          const space = getEmSpacing(node);
          if (typeof space === 'number' && space < threshold[property]) {
            invalid = true;
          }
        }
      });

      if (invalid) {
        stylelint.utils.report({
          ruleName,
          result,
          message: messages[property],
          node: decl,
        });
      }
    });
  };
};

function getEmSpacing(node: postcssValueParser.Node) {
  const { spaceStr, unit } = spaceRegex.exec(node.value)?.groups ?? {};
  if (!spaceStr || !unit) {
    return undefined;
  }
  const space: number = Number.parseFloat(spaceStr);
  switch (unit) {
    case '%': {
      return space / 100;
    }
    case 'rch':
    case 'ch':
    case 'rex':
    case 'ex': {
      return space / 2;
    }
    case 'rcap':
    case 'cap': {
      return space * 0.7;
    }
    // all other cases are em-equivalent
  }
  return space;
}

function isTargetedProperty(key: string): key is keyof typeof messages {
  return key in messages;
}

export const rule = stylelint.createPlugin(
  ruleName,
  Object.assign(ruleImpl, {
    messages,
    ruleName,
  }),
) as { ruleName: string; rule: stylelint.Rule };
