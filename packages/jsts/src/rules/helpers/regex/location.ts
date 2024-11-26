/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { AST, Rule } from 'eslint';
import estree from 'estree';
import * as regexpp from '@eslint-community/regexpp';
import { isRegexLiteral, isStringLiteral } from '../index.js';
import { getRegexpRange } from './range.js';

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
