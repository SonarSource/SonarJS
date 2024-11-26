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
import Detector from '../Detector.js';

export default class EndWithDetector extends Detector {
  endOfLines: string[];

  constructor(probability: number, ...endOfLines: string[]) {
    super(probability);
    this.endOfLines = endOfLines;
  }

  scan(line: string): number {
    for (let i = line.length - 1; i >= 0; i--) {
      const char = line.charAt(i);
      for (const endOfLine of this.endOfLines) {
        if (char === endOfLine) {
          return 1;
        }
      }
      if (!isWhitespace(char) && char !== '*' && char !== '/') {
        return 0;
      }
    }
    return 0;

    function isWhitespace(char: string): boolean {
      return /\s/.test(char);
    }
  }
}
