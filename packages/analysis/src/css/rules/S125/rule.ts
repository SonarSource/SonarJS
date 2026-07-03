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
// https://sonarsource.github.io/rspec/#/rspec/S125/css

import pkg, { type PostcssResult } from 'stylelint';
const { createPlugin, utils } = pkg;
import type PostCSS from 'postcss';
import { parse } from 'postcss';

const ruleName = 'sonar/no-commented-code';
const messages = { commentedCode: 'Remove this commented out code.' };

const ruleImpl: pkg.RuleBase = () => {
  return (root: PostCSS.Root, result: PostcssResult) => {
    root.walkComments((comment: PostCSS.Comment) => {
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
};

function isLikelyCss(text: string) {
  return looksLikeCssRule(text) || looksLikeCssDeclaration(text) || looksLikeCssAtRule(text);
}

function looksLikeCssRule(text: string) {
  let selectorLength = 0;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (isCssSelectorChar(char)) {
      selectorLength++;
      continue;
    }

    if (char === '{' && selectorLength > 0 && text.indexOf('}', index + 1) !== -1) {
      return true;
    }

    selectorLength = 0;
  }

  return false;
}

function looksLikeCssDeclaration(text: string) {
  for (let index = 0; index < text.length; ) {
    if (!isCssPropertyChar(text[index])) {
      index++;
      continue;
    }

    let propertyEnd = index + 1;
    while (propertyEnd < text.length && isCssPropertyChar(text[propertyEnd])) {
      propertyEnd++;
    }

    let cursor = propertyEnd;
    while (cursor < text.length && isWhitespace(text[cursor])) {
      cursor++;
    }
    if (text[cursor] === ':') {
      cursor++;
      while (cursor < text.length && isWhitespace(text[cursor])) {
        cursor++;
      }
      if (cursor < text.length && text[cursor] !== ';') {
        while (cursor < text.length && text[cursor] !== ';') {
          cursor++;
        }
        if (cursor < text.length) {
          return true;
        }
      }
    }

    index = propertyEnd;
  }

  return false;
}

function looksLikeCssAtRule(text: string) {
  for (let index = 0; index < text.length; index++) {
    if (text[index] !== '@') {
      continue;
    }

    let cursor = index + 1;
    while (cursor < text.length && isAtRuleNameChar(text[cursor])) {
      cursor++;
    }
    while (cursor < text.length && isWhitespace(text[cursor])) {
      cursor++;
    }
    while (cursor < text.length && text[cursor] !== ';' && text[cursor] !== '{') {
      cursor++;
    }
    if (cursor >= text.length) {
      continue;
    }
    if (text[cursor] === ';') {
      return true;
    }
    if (text.indexOf('}', cursor + 1) !== -1) {
      return true;
    }
  }

  return false;
}

function isCssSelectorChar(char: string | undefined): char is string {
  if (char === undefined) {
    return false;
  }

  const lower = char.toLowerCase();
  return (
    (lower >= 'a' && lower <= 'z') ||
    (char >= '0' && char <= '9') ||
    char === ',' ||
    char === '.' ||
    char === '-' ||
    char === '#' ||
    char === ':' ||
    char === '_' ||
    isWhitespace(char)
  );
}

function isCssPropertyChar(char: string | undefined): char is string {
  if (char === undefined) {
    return false;
  }

  const lower = char.toLowerCase();
  return (lower >= 'a' && lower <= 'z') || char === '-';
}

function isAtRuleNameChar(char: string | undefined): char is string {
  return isCssPropertyChar(char);
}

function isWhitespace(char: string | undefined): char is string {
  return char !== undefined && /\s/u.test(char);
}

export const rule = createPlugin(
  ruleName,
  Object.assign(ruleImpl, {
    messages,
    ruleName,
  }),
) as { ruleName: string; rule: pkg.Rule };
