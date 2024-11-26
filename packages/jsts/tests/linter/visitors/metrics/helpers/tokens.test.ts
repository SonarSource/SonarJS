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
import { extractTokensAndComments } from '../../../../../src/linter/visitors/metrics/helpers/index.js';
import { AST } from 'vue-eslint-parser';
import path from 'path';
import { parseJavaScriptSourceFile } from '../../../../tools/index.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';

describe('extractTokensAndComments', () => {
  it('should extract tokens and comments', async () => {
    const filePath = path.join(import.meta.dirname, './fixtures/tokens.js');
    const sourceCode = await parseJavaScriptSourceFile(filePath, []);
    const { tokens, comments } = parseTokensAndComments(extractTokensAndComments(sourceCode));
    expect(tokens).toEqual(['foo', '(', `'hello'`, ')', ';']);
    expect(comments).toEqual(['multi-line', 'single-line']);
  });

  it('should extract tokens and comments from Vue files', async () => {
    const filePath = path.join(import.meta.dirname, './fixtures/tokens.vue');
    const sourceCode = await parseJavaScriptSourceFile(filePath, []);
    const { tokens, comments } = parseTokensAndComments(extractTokensAndComments(sourceCode));
    expect(tokens).toEqual(expect.arrayContaining(['jsCode', 'vue-tag']));
    expect(comments).toEqual(['JS comment', 'HTML comment']);
  });
});

function parseTokensAndComments({
  tokens,
  comments,
}: {
  tokens: AST.Token[];
  comments: AST.Token[];
}): {
  tokens: string[];
  comments: string[];
} {
  return {
    tokens: tokens.map(comment => comment.value),
    comments: comments.map(comment => comment.value),
  };
}
