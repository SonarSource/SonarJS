/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { build } from '../../../../../src/builders/build.js';
import type estree from 'estree';

export interface Comment {
  value: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
}

/**
 *
 * @param fileContent
 * @param filePath
 * @returns
 */
export function extractComments(fileContent: string, filePath: string): Comment[] {
  const { sourceCode: parsed } = build({
    fileContent,
    filePath,
    fileType: 'MAIN',
    tsConfigs: [],
    language: 'js',
  });
  let esTreeComments: estree.Comment[];
  if (parsed) {
    esTreeComments = parsed.getAllComments();
  } else {
    throw new Error(`File not parseable: ${fileContent}`);
  }
  return esTreeComments.map(c => {
    return {
      value: c.value,
      line: c.loc!.start.line,
      column: c.loc!.start.column + 2, // these offsets are everywhere down the road
      endLine: c.loc!.end.line,
      endColumn: c.loc!.end.column + 1, // same
    };
  });
}
