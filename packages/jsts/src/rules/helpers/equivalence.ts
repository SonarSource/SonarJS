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
import { type Node } from './ast.js';
import { AST, SourceCode } from 'eslint';
import estree from 'estree';

/**
 * Equivalence is implemented by comparing node types and their tokens.
 * Classic implementation would recursively compare children,
 * but "estree" doesn't provide access to children when node type is unknown
 */
export function areEquivalent(
  first: Node | Node[],
  second: Node | Node[],
  sourceCode: SourceCode,
): boolean {
  if (Array.isArray(first) && Array.isArray(second)) {
    return (
      first.length === second.length &&
      first.every((firstNode, index) => areEquivalent(firstNode, second[index], sourceCode))
    );
  } else if (!Array.isArray(first) && !Array.isArray(second)) {
    return (
      first.type === second.type &&
      compareTokens(
        sourceCode.getTokens(first as estree.Node),
        sourceCode.getTokens(second as estree.Node),
      )
    );
  }
  return false;
}

function compareTokens(firstTokens: AST.Token[], secondTokens: AST.Token[]) {
  return (
    firstTokens.length === secondTokens.length &&
    firstTokens.every((firstToken, index) => firstToken.value === secondTokens[index].value)
  );
}
