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
  const highlights: (Highlight | undefined)[] = [];
  for (const token of sourceCode.ast.tokens) {
    switch ((token as any).type) {
      case "Keyword":
        highlights.push(highlight(token, "KEYWORD"));
        break;
      case "String":
      case "Template":
        highlights.push(highlight(token, "STRING"));
        break;
      case "Numeric":
        highlights.push(highlight(token, "CONSTANT"));
        break;
    }
  }
  for (const comment of sourceCode.ast.comments) {
    if (comment.type === "Block" && comment.value.startsWith("*")) {
      highlights.push(highlight(comment, "STRUCTURED_COMMENT"));
    } else {
      highlights.push(highlight(comment, "COMMENT"));
    }
  }
  return { highlights: highlights.filter(h => h !== undefined) as Highlight[] };
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
