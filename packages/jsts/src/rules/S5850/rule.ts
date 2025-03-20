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
// https://sonarsource.github.io/rspec/#/rspec/S5850/javascript

import type { Rule } from 'eslint';
import { AST } from '@eslint-community/regexpp';
import { generateMeta } from '../helpers/index.js';
import * as meta from './generated-meta.js';
import { createRegExpRule } from '../helpers/regex/rule-template.js';

enum Position {
  BEGINNING,
  END,
}

export const rule: Rule.RuleModule = createRegExpRule(context => {
  return {
    onPatternEnter: (pattern: AST.Pattern) => {
      const { alternatives } = pattern;
      if (
        alternatives.length > 1 &&
        (anchoredAt(alternatives, Position.BEGINNING) || anchoredAt(alternatives, Position.END)) &&
        notAnchoredElseWhere(alternatives)
      ) {
        context.reportRegExpNode({
          message:
            'Group parts of the regex together to make the intended operator precedence explicit.',
          node: context.node,
          regexpNode: pattern,
        });
      }
    },
  };
}, generateMeta(meta));

function anchoredAt(alternatives: AST.Alternative[], position: Position): boolean {
  const itemIndex = position === Position.BEGINNING ? 0 : alternatives.length - 1;
  const firstOrLast = alternatives[itemIndex];
  return isAnchored(firstOrLast, position);
}

function notAnchoredElseWhere(alternatives: AST.Alternative[]): boolean {
  if (
    isAnchored(alternatives[0], Position.END) ||
    isAnchored(alternatives[alternatives.length - 1], Position.BEGINNING)
  ) {
    return false;
  }
  for (const alternative of alternatives.slice(1, alternatives.length - 1)) {
    if (isAnchored(alternative, Position.BEGINNING) || isAnchored(alternative, Position.END)) {
      return false;
    }
  }
  return true;
}

function isAnchored(alternative: AST.Alternative, position: Position): boolean {
  const { elements } = alternative;
  if (elements.length === 0) {
    return false;
  }
  const index = position === Position.BEGINNING ? 0 : elements.length - 1;
  const firstOrLast = elements[index];
  return isAnchor(firstOrLast);
}

function isAnchor(element: AST.Element) {
  return element.type === 'Assertion' && (element.kind === 'start' || element.kind === 'end');
}
