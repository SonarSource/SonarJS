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

    if (char === '{' && selectorLength > 0 && text.includes('}', index + 1)) {
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

    const propertyEnd = skipWhile(text, index + 1, isCssPropertyChar);
    if (hasCssDeclarationValue(text, propertyEnd)) {
      return true;
    }

    index = propertyEnd;
  }

  return false;
}

function hasCssDeclarationValue(text: string, propertyEnd: number) {
  const colonIndex = skipWhile(text, propertyEnd, isWhitespace);
  return text[colonIndex] === ':' && findCharacter(text, colonIndex + 1, ';') > colonIndex + 1;
}

function looksLikeCssAtRule(text: string) {
  for (let index = 0; index < text.length; index++) {
    if (text[index] !== '@') {
      continue;
    }

    const bodyStart = skipWhile(text, skipWhile(text, index + 1, isAtRuleNameChar), isWhitespace);
    const terminator = findCharacter(text, bodyStart, ';{');
    if (terminator < 0) {
      continue;
    }
    if (text[terminator] === ';') {
      return true;
    }
    if (findCharacter(text, terminator + 1, '}') >= 0) {
      return true;
    }
  }

  return false;
}

function skipWhile(text: string, start: number, predicate: (char: string | undefined) => boolean) {
  let index = start;
  while (index < text.length && predicate(text[index])) {
    index++;
  }
  return index;
}

function findCharacter(text: string, start: number, characters: string) {
  for (let index = start; index < text.length; index++) {
    if (characters.includes(text[index])) {
      return index;
    }
  }
  return -1;
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
