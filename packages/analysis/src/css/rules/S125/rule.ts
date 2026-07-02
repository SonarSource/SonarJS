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
const cssSelectorHead = /^[a-z0-9\s,.\-#:_\[\]"'=()*%>+~|]+$/i;
const cssDeclarationProperty = /^[a-z-]+$/i;
const cssAtRule = /^@[a-z-]+(?:\s|$)/i;

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
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }

  const firstOpenBrace = trimmed.indexOf('{');
  if (firstOpenBrace > 0 && trimmed.includes('}', firstOpenBrace + 1)) {
    const head = trimmed.slice(0, firstOpenBrace).trim();
    if (cssAtRule.test(head) || cssSelectorHead.test(head)) {
      return true;
    }
  }

  const firstColon = trimmed.indexOf(':');
  const lastSemicolon = trimmed.lastIndexOf(';');
  if (firstColon > 0 && lastSemicolon > firstColon + 1) {
    return cssDeclarationProperty.test(trimmed.slice(0, firstColon).trim());
  }

  return cssAtRule.test(trimmed) && trimmed.includes(';');
}

export const rule = createPlugin(
  ruleName,
  Object.assign(ruleImpl, {
    messages,
    ruleName,
  }),
) as { ruleName: string; rule: pkg.Rule };
