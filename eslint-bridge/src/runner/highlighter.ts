/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
import { AST, SourceCode } from "eslint";
import * as ESTree from "estree";

export default function getHighlighting(sourceCode: SourceCode) {
  const highlights: Highlight[] = [];
  const nodes: any[] = [...sourceCode.ast.tokens, ...sourceCode.ast.comments];
  for (const node of nodes) {
    let highlighted: Highlight | undefined;
    switch (node.type) {
      case "Keyword":
        highlighted = highlight(node, "KEYWORD");
        break;
      case "String":
      case "Template":
        highlighted = highlight(node, "STRING");
        break;
      case "Numeric":
        highlighted = highlight(node, "CONSTANT");
        break;
      case "Block":
        if (node.value.startsWith("*")) {
          highlighted = highlight(node, "STRUCTURED_COMMENT");
          break;
        }
      case "Line":
        highlighted = highlight(node, "COMMENT");
        break;
    }
    if (highlighted) {
      highlights.push(highlighted);
    }
  }
  return { highlights };
}

export type SonarTypeOfText = "CONSTANT" | "COMMENT" | "STRUCTURED_COMMENT" | "KEYWORD" | "STRING";

export interface Highlight {
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
  textType: SonarTypeOfText;
}

function highlight(
  node: AST.Token | ESTree.Comment,
  highlightKind: SonarTypeOfText,
): Highlight | undefined {
  if (!node.loc) {
    return undefined;
  }
  const startPosition = node.loc.start;
  const endPosition = node.loc.end;
  return {
    startLine: startPosition.line,
    startCol: startPosition.column,
    endLine: endPosition.line,
    endCol: endPosition.column,
    textType: highlightKind,
  };
}
