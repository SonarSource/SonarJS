/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
/**
 * An extracted embedded JavaScript code snippet
 *
 * @param code JS code
 * @param line Line where JS code starts
 * @param column Column where JS code starts
 * @param offset Offset where JS code starts
 * @param lineStarts Offset at each line start for the whole file
 * @param text Whole file content
 * @param format Format of the string that embeds the JS code
 * @param extras Additional data, filled by ExtrasPicker
 */
export type EmbeddedJS = {
  code: string;
  line: number;
  column: number;
  offset: number;
  lineStarts: number[];
  text: string;
  format: 'PLAIN' | 'BLOCK_FOLDED' | 'BLOCK_LITERAL';
  extras: {
    resourceName?: string;
  };
};
