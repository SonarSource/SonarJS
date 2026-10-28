/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import type { SassStatement } from './sass-statement.js';

/** The scanner handles quoted text and delimiters before applying these statement policies. */
export function initialStatementType(text: string): SassStatement['type'] {
  return text.startsWith('@') || /^[+=][\w-]/.test(text) ? 'atrule' : 'rule';
}

export function isDeclarationSeparator(text: string, colon: number): boolean {
  return (
    colon > 0 &&
    (/\s/.test(text[colon + 1] ?? ' ') ||
      text.startsWith('$') ||
      /^[\w-]+\.\$/.test(text) ||
      text.startsWith('--'))
  );
}

export function canHaveChildren(statement: SassStatement, css: string): boolean {
  return (
    statement.type !== 'comment' &&
    css[statement.start] !== '$' &&
    !/^@(use|forward|import|return|extend|debug|warn|error|content)\b/.test(
      css.slice(statement.start, statement.headerEnd),
    )
  );
}

/** Continuations not already covered by an open delimiter or a block comment. */
export function continuesOnNewline(
  type: SassStatement['type'],
  firstLine: string,
  header: string,
  selector: string,
): boolean {
  if (type === 'rule') return selector.trimEnd().endsWith(',');
  const expression =
    type === 'decl' || /^@(if|else|each|for|while|return|debug|warn|error)\b/.test(firstLine);
  return (
    expression &&
    !firstLine.startsWith('--') &&
    /(?:[+*/<>=]|\s[-%]|\s(?:and|or|not))$/.test(header.trimEnd())
  );
}
