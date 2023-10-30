/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import { isRegexLiteral, isStringLiteral } from '../';
import { getRegexpRange } from './range';
import { Change } from 'diff';

/**
 * Gets the regexp node location in the ESLint referential
 * @param node the ESLint regex node
 * @param regexpNode the regexp regex node
 * @param context the rule context
 * @param offset an offset to apply on the location
 * @param parseDiff
 * @returns the regexp node location in the ESLint referential
 */
export function getRegexpLocation(
  node: estree.Node,
  regexpNode: regexpp.AST.Node,
  context: Rule.RuleContext,
  offset = [0, 0],
  parseDiff: Change[] = [],
): AST.SourceLocation {
  let loc: AST.SourceLocation;
  if (isRegexLiteral(node) || isStringLiteral(node)) {
    const source = context.sourceCode;
    const [start] = node.range!;
    const [reStart, reEnd] = getRegexpRange(node, regexpNode);
    let startIndex = start + reStart + offset[0];
    let endIndex = start + reEnd + offset[1];

    let index = 1;
    for (const change of parseDiff) {
      if (change.removed) {
        if (startIndex >= index) {
          startIndex += change.value.length;
        }
        if (endIndex >= index) {
          endIndex += change.value.length;
        }
      } else if (change.added) {
        index += change.value.length;
        if (startIndex >= index) {
          startIndex -= change.value.length;
        }
        if (endIndex >= index) {
          endIndex -= change.value.length;
        }
      } else {
        // Chunk was both in input and output
        index += change.value.length;
      }
    }

    loc = {
      start: source.getLocFromIndex(startIndex),
      end: source.getLocFromIndex(endIndex),
    };
  } else {
    loc = node.loc!;
  }
  return loc;
}
