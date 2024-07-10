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
import { visit } from '../../../src/linter/visitors';
import path from 'path';
import { parseTypeScriptSourceFile } from '../../tools/helpers';
import { childrenOf } from '../../../src/rules/helpers';

describe('visitor', () => {
  describe('visit', () => {
    it('should traverse an ESLint node', async () => {
      const filePath = path.join(__dirname, './fixtures/visitor/tree.ts');
      const sourceCode = await parseTypeScriptSourceFile(filePath, []);

      const visited = [];
      visit(sourceCode, node => visited.push(node.type + ' ' + node.loc.start.line));

      expect(visited).toEqual([
        'Program 1',
        'FunctionDeclaration 1',
        'Identifier 1',
        'Identifier 1',
        'TSTypeAnnotation 1',
        'TSNumberKeyword 1',
        'TSTypeAnnotation 1',
        'TSNumberKeyword 1',
        'BlockStatement 1',
        'IfStatement 2',
        'BinaryExpression 2',
        'Identifier 2',
        'Literal 2',
        'BlockStatement 2',
        'ReturnStatement 3',
        'Literal 3',
        'ReturnStatement 5',
        'BinaryExpression 5',
        'Identifier 5',
        'CallExpression 5',
        'Identifier 5',
        'BinaryExpression 5',
        'Identifier 5',
        'Literal 5',
      ]);
    });
  });

  describe('childrenOf', () => {
    it('should return the child of an ESLint node', async () => {
      const filePath = path.join(__dirname, './fixtures/visitor/child.ts');
      const sourceCode = await parseTypeScriptSourceFile(filePath, []);
      const children = childrenOf(sourceCode.ast, sourceCode.visitorKeys).map(node => node.type);
      expect(children).toEqual(['IfStatement']);
    });

    it('should return the children of an ESLint node', async () => {
      const filePath = path.join(__dirname, './fixtures/visitor/children.ts');
      const sourceCode = await parseTypeScriptSourceFile(filePath, []);
      const children = childrenOf(sourceCode.ast, sourceCode.visitorKeys).map(node => node.type);
      expect(children).toEqual(['WhileStatement', 'EmptyStatement']);
    });
  });
});
