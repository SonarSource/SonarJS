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
import { SourceCode } from 'eslint';
import { childrenOf } from '../../rules/helpers/ancestor.js';

/**
 * Visits the abstract syntax tree of an ESLint source code
 * @param sourceCode the source code to visit
 * @param callback a callback function invoked at each node visit
 */
export function visit(sourceCode: SourceCode, callback: (node: estree.Node) => void): void {
  const stack: estree.Node[] = [sourceCode.ast];
  while (stack.length) {
    const node = stack.pop() as estree.Node;
    callback(node);
    stack.push(...childrenOf(node, sourceCode.visitorKeys).reverse());
  }
}
