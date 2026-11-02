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
type SassStatementType = 'rule' | 'decl' | 'atrule' | 'comment';

/** Statement boundaries only: expressions remain source text. End offsets are exclusive. */
export interface SassStatement {
  type: SassStatementType;
  start: number;
  end: number;
  headerEnd: number;
  inline?: boolean;
  trailingComment?: number;
  /** A colon that may introduce a declaration once child indentation is known. */
  declarationCandidate?: number;
  nodes?: SassStatement[];
}

/** The first physical line of a statement, including its indentation. */
export interface SassLine {
  start: number;
  end: number;
  next: number;
  indent: string;
}
