/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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

export default class CamelCaseDetector extends Detector {
  scan(line: string): number {
    for (let i = 0; i < line.length - 1; i++) {
      if (isLowerCase(line.charAt(i)) && isUpperCase(line.charAt(i + 1))) {
        return 1;
      }
    }
    return 0;
  }
}

function isLowerCase(char: string): boolean {
  return char.toLowerCase() === char;
}

function isUpperCase(char: string): boolean {
  return char.toUpperCase() === char;
}
