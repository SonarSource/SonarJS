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
// https://sonarsource.github.io/rspec/#/rspec/S6019/javascript

import { Rule } from 'eslint';
import * as regexpp from '@eslint-community/regexpp';
import { createRegExpRule, RegexRuleContext } from '../helpers/regex';
import { generateMeta } from '../helpers';
import rspecMeta from './meta.json';

export const rule: Rule.RuleModule = createRegExpRule(
  context => {
    return {
      onRegExpLiteralEnter: (node: regexpp.AST.RegExpLiteral) => {
        node.pattern.alternatives.forEach(({ elements }) => checkElements(elements, context));
      },
    };
  },
  generateMeta(rspecMeta as Rule.RuleMetaData),
);

function report(quantifier: regexpp.AST.Quantifier, context: RegexRuleContext) {
  const ending = quantifier.min === 1 ? '' : 's';
  const message = `Fix this reluctant quantifier that will only ever match ${quantifier.min} repetition${ending}.`;
  context.reportRegExpNode({
    message,
    regexpNode: quantifier,
    node: context.node,
  });
}

function checkElements(elements: regexpp.AST.Element[], context: RegexRuleContext) {
  if (elements.length === 0) {
    return;
  }

  const lastElement = elements[elements.length - 1];
  if (lastElement.type === 'Quantifier' && !lastElement.greedy) {
    report(lastElement, context);
    return;
  }

  if (elements.length === 1) {
    return;
  }

  const lastButOneElement = elements[elements.length - 2];
  if (lastButOneElement.type === 'Quantifier' && !lastButOneElement.greedy) {
    if (lastElement.type === 'Assertion' && lastElement.kind === 'end') {
      context.reportRegExpNode({
        message: `Remove the '?' from this unnecessarily reluctant quantifier.`,
        regexpNode: lastButOneElement,
        node: context.node,
      });
    } else if (lastElement.type === 'Quantifier' && lastElement.min === 0) {
      report(lastButOneElement, context);
    }
  }
}
