/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
import { SourceCode } from 'eslint';
import { Location } from './location';

export default function getCpdTokens(sourceCode: SourceCode): { cpdTokens: CpdToken[] } {
  const cpdTokens: CpdToken[] = [];
  const tokens = sourceCode.ast.tokens;

  tokens.forEach(token => {
    let text = token.value;

    if (text.trim().length === 0) {
      // for EndOfFileToken and JsxText tokens containing only whitespaces
      return;
    }

    if (text.startsWith('"') || text.startsWith("'") || text.startsWith('`')) {
      text = 'LITERAL';
    }

    const startPosition = token.loc.start;
    const endPosition = token.loc.end;

    cpdTokens.push({
      location: {
        startLine: startPosition.line,
        startCol: startPosition.column,
        endLine: endPosition.line,
        endCol: endPosition.column,
      },
      image: text,
    });
  });

  return { cpdTokens };
}

export interface CpdToken {
  location: Location;
  image: string;
}
