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
import { AST, Rule } from 'eslint';
import * as estree from 'estree';
import * as regexpp from '@eslint-community/regexpp';
import { isRegexLiteral, isStringLiteral } from '..//index.ts';
import { getRegexpRange } from './range.ts';

/**
 * Gets the regexp node location in the ESLint referential
 * @param node the ESLint regex node
 * @param regexpNode the regexp regex node
 * @param context the rule context
 * @param offset an offset to apply on the location
 * @returns the regexp node location in the ESLint referential
 */
export function getRegexpLocation(
  node: estree.Node,
  regexpNode: regexpp.AST.Node,
  context: Rule.RuleContext,
  offset = [0, 0],
): AST.SourceLocation | null {
  let loc: AST.SourceLocation;
  if (isRegexLiteral(node) || isStringLiteral(node)) {
    const source = context.sourceCode;
    const [start] = node.range!;
    const [reStart, reEnd] = getRegexpRange(node, regexpNode);
    const locationStart = start + reStart + offset[0];
    const locationEnd = start + reEnd + offset[1];
    if (locationStart === locationEnd) {
      return null;
    } else {
      loc = {
        start: source.getLocFromIndex(locationStart),
        end: source.getLocFromIndex(locationEnd),
      };
    }
  } else {
    loc = node.loc!;
  }
  return loc;
}
