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
import estree from 'estree';
import type { Rule } from 'eslint';

export function removeNodeWithLeadingWhitespaces(
  context: Rule.RuleContext,
  node: estree.Node,
  fixer: Rule.RuleFixer,
  removeUntil?: number,
) {
  const previousComments = context.sourceCode.getCommentsBefore(node);
  let start = 0;
  if (previousComments.length === 0) {
    const previousToken = context.sourceCode.getTokenBefore(node);
    if (previousToken) {
      start = previousToken.range[1];
    }
  } else {
    start = previousComments[previousComments.length - 1].range![1];
  }

  const end = removeUntil ?? node.range![1];
  return fixer.removeRange([start, end]);
}
