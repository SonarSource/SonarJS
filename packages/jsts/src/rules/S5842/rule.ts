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
// https://sonarsource.github.io/rspec/#/rspec/S5842/javascript

import type { Rule } from 'eslint';
import type { AST } from '@eslint-community/regexpp';
import { generateMeta } from '../helpers/index.js';
import * as meta from './generated-meta.js';
import { createRegExpRule } from '../helpers/regex/rule-template.js';

export const rule: Rule.RuleModule = createRegExpRule(context => {
  return {
    onQuantifierEnter: (node: AST.Quantifier) => {
      const { element } = node;
      if (matchEmptyString(element)) {
        context.reportRegExpNode({
          message: `Rework this part of the regex to not match the empty string.`,
          node: context.node,
          regexpNode: element,
        });
      }
    },
  };
}, generateMeta(meta));

function matchEmptyString(node: AST.Node): boolean {
  switch (node.type) {
    case 'Alternative':
      return node.elements.every(matchEmptyString);
    case 'Assertion':
      return true;
    case 'CapturingGroup':
    case 'Group':
    case 'Pattern':
      return node.alternatives.some(matchEmptyString);
    case 'Quantifier':
      return node.min === 0;
    default:
      return false;
  }
}
