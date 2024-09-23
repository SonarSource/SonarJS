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
import { extractTokensAndComments } from '../../../../../src/linter/visitors/metrics/helpers/index.js';
import { AST } from 'vue-eslint-parser';
import path from 'path';
import { parseJavaScriptSourceFile } from '../../../../tools/index.js';

describe('extractTokensAndComments', () => {
  it('should extract tokens and comments', async () => {
    const filePath = path.join(__dirname, './fixtures/tokens.js');
    const sourceCode = await parseJavaScriptSourceFile(filePath, []);
    const { tokens, comments } = parseTokensAndComments(extractTokensAndComments(sourceCode));
    expect(tokens).toEqual(['foo', '(', `'hello'`, ')', ';']);
    expect(comments).toEqual(['multi-line', 'single-line']);
  });

  it('should extract tokens and comments from Vue files', async () => {
    const filePath = path.join(__dirname, './fixtures/tokens.vue');
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
