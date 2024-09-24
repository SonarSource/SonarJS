/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
// https://sonarsource.github.io/rspec/#/rspec/S6353/javascript

import { Rule } from 'eslint';
import { CharacterClass, Flags, Quantifier, RegExpLiteral } from '@eslint-community/regexpp/ast';
import { createRegExpRule, RegexRuleContext } from '../helpers/regex/index.ts';
import { generateMeta } from '../helpers/index.ts';
import { meta } from './meta.ts';

export const rule: Rule.RuleModule = createRegExpRule(
  context => {
    let flags: Flags;
    return {
      onRegExpLiteralEnter: (node: RegExpLiteral) => {
        ({ flags } = node);
      },
      onCharacterClassEnter: (node: CharacterClass) => {
        checkBulkyAnyCharacterClass(node, flags, context);
        checkBulkyNumericCharacterClass(node, context);
        checkBulkyAlphaNumericCharacterClass(node, context);
      },
      onQuantifierEnter: (node: Quantifier) => {
        checkBulkyQuantifier(node, context);
      },
    };
  },
  generateMeta(meta as Rule.RuleMetaData),
);

function checkBulkyAnyCharacterClass(
  node: CharacterClass,
  flags: Flags,
  context: RegexRuleContext,
) {
  if (node.negate || node.elements.length !== 2) {
    return;
  }
  let hasLowerEscapeW = false;
  let hasUpperEscapeW = false;
  let hasLowerEscapeD = false;
  let hasUpperEscapeD = false;
  let hasLowerEscapeS = false;
  let hasUpperEscapeS = false;
  node.elements.forEach(element => {
    hasLowerEscapeW ||=
      element.type === 'CharacterSet' && element.kind === 'word' && !element.negate;
    hasUpperEscapeW ||=
      element.type === 'CharacterSet' && element.kind === 'word' && element.negate;
    hasLowerEscapeD ||=
      element.type === 'CharacterSet' && element.kind === 'digit' && !element.negate;
    hasUpperEscapeD ||=
      element.type === 'CharacterSet' && element.kind === 'digit' && element.negate;
    hasLowerEscapeS ||=
      element.type === 'CharacterSet' && element.kind === 'space' && !element.negate;
    hasUpperEscapeS ||=
      element.type === 'CharacterSet' && element.kind === 'space' && element.negate;
  });
  const isBulkyAnyCharacterClass =
    (hasLowerEscapeW && hasUpperEscapeW) ||
    (hasLowerEscapeD && hasUpperEscapeD) ||
    (hasLowerEscapeS && hasUpperEscapeS && flags.dotAll);
  if (isBulkyAnyCharacterClass) {
    context.reportRegExpNode({
      message: `Use concise character class syntax '.' instead of '${node.raw}'.`,
      node: context.node,
      regexpNode: node,
    });
  }
}

function checkBulkyNumericCharacterClass(node: CharacterClass, context: RegexRuleContext) {
  if (node.elements.length === 1) {
    const [element] = node.elements;
    const hasDigit = element.type === 'CharacterClassRange' && element.raw === '0-9';
    if (hasDigit) {
      const expected = node.negate ? '\\D' : '\\d';
      const actual = node.raw;
      context.reportRegExpNode({
        message: `Use concise character class syntax '${expected}' instead of '${actual}'.`,
        node: context.node,
        regexpNode: node,
      });
    }
  }
}

function checkBulkyAlphaNumericCharacterClass(node: CharacterClass, context: RegexRuleContext) {
  if (node.elements.length === 4) {
    let hasDigit = false,
      hasLowerCase = false,
      hasUpperCase = false,
      hasUnderscore = false;
    for (const element of node.elements) {
      hasDigit ||= element.type === 'CharacterClassRange' && element.raw === '0-9';
      hasLowerCase ||= element.type === 'CharacterClassRange' && element.raw === 'a-z';
      hasUpperCase ||= element.type === 'CharacterClassRange' && element.raw === 'A-Z';
      hasUnderscore ||= element.type === 'Character' && element.raw === '_';
    }
    if (hasDigit && hasLowerCase && hasUpperCase && hasUnderscore) {
      const expected = node.negate ? '\\W' : '\\w';
      const actual = node.raw;
      context.reportRegExpNode({
        message: `Use concise character class syntax '${expected}' instead of '${actual}'.`,
        node: context.node,
        regexpNode: node,
      });
    }
  }
}

function checkBulkyQuantifier(node: Quantifier, context: RegexRuleContext) {
  const { raw } = node;
  let message: string | undefined;
  let bulkyQuantifier: { concise: string; verbose: string } | undefined;

  if (/\{0,1\}\??$/.test(raw)) {
    bulkyQuantifier = { concise: '?', verbose: '{0,1}' };
  } else if (/\{0,0\}\??$/.test(raw)) {
    message = `Remove redundant ${node.element.raw}{0,0}.`;
  } else if (/\{0\}\??$/.test(raw)) {
    message = `Remove redundant ${node.element.raw}{0}.`;
  } else if (/\{1,1\}\??$/.test(raw)) {
    message = 'Remove redundant quantifier {1,1}.';
  } else if (/\{1\}\??$/.test(raw)) {
    message = 'Remove redundant quantifier {1}.';
  } else if (/\{0,\}\??$/.test(raw)) {
    bulkyQuantifier = { concise: '*', verbose: '{0,}' };
  } else if (/\{1,\}\??$/.test(raw)) {
    bulkyQuantifier = { concise: '+', verbose: '{1,}' };
  } else if (/\{(\d+),\1\}\??$/.test(raw)) {
    bulkyQuantifier = { concise: `{${node.min}}`, verbose: `{${node.min},${node.min}}` };
  }

  if (bulkyQuantifier) {
    message = `Use concise quantifier syntax '${bulkyQuantifier.concise}' instead of '${bulkyQuantifier.verbose}'.`;
  }

  if (message) {
    context.reportRegExpNode({
      message,
      node: context.node,
      regexpNode: node,
    });
  }
}
