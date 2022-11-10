/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
import LanguageFootprint from './LanguageFootprint';

export class CodeRecognizer {
  language: LanguageFootprint;
  threshold: number;

  constructor(threshold: number, language: LanguageFootprint) {
    this.language = language;
    this.threshold = threshold;
  }

  recognition(line: string) {
    let probability = 0;
    for (const pattern of this.language.getDetectors()) {
      probability = 1 - (1 - probability) * (1 - pattern.recognition(line));
    }
    return probability;
  }

  extractCodeLines(lines: string[]): string[] {
    return lines.filter(line => this.recognition(line) >= this.threshold);
  }

  isLineOfCode(line: string): boolean {
    return this.recognition(line) - this.threshold > 0;
  }
}
