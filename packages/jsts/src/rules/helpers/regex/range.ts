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
import { AST } from 'eslint';
import * as estree from 'estree';
import * as regexpp from '@eslint-community/regexpp';
import { isRegexLiteral, isStringLiteral } from '../';

/**
 * Returns the location of regexpNode relative to the node, which is regexp string or literal. If the computation
 * of location fails, it returns the range of the whole node.
 */
export function getRegexpRange(node: estree.Node, regexpNode: regexpp.AST.Node): AST.Range {
  if (isRegexLiteral(node)) {
    return [regexpNode.start, regexpNode.end];
  }
  if (isStringLiteral(node)) {
    return [regexpNode.start, regexpNode.end];
  }
  if (node.type === 'TemplateLiteral') {
    // we don't support these properly
    return nodeRange(node);
  }
  throw new Error(`Expected regexp or string literal, got ${node.type}`);
}

function nodeRange(node: estree.Node): [number, number] {
  return [0, node.range![1] - node.range![0]];
}
