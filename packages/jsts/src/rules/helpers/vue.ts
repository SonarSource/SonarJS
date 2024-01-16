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
import { Rule } from 'eslint';
import * as estree from 'estree';
import { AST } from 'vue-eslint-parser';

type VChildElement = AST.VElement | AST.VText | AST.VExpressionContainer | AST.VStyleElement;

function isVueSetupScript(element: VChildElement): boolean {
  return (
    element.type === 'VElement' &&
    element.name === 'script' &&
    !!element.startTag.attributes.find(attr => attr.key.name === 'setup')
  );
}

export function isInsideVueSetupScript(node: estree.Node, ctx: Rule.RuleContext): boolean {
  const doc: AST.VDocumentFragment = ctx.parserServices?.getDocumentFragment?.();
  const setupScript = doc?.children.find(isVueSetupScript);
  return (
    !!setupScript &&
    !!node.range &&
    setupScript.range[0] <= node.range[0] &&
    setupScript.range[1] >= node.range[1]
  );
}
