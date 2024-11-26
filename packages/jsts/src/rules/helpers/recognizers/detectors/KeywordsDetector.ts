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

export default class KeywordsDetector extends Detector {
  keywords: string[];

  constructor(probability: number, ...keywords: string[]) {
    super(probability);
    this.keywords = keywords;
  }

  scan(line: string): number {
    let matchers = 0;
    const words = line.split(/[ \t(),{}]/);
    for (const word of words) {
      if (this.keywords.includes(word)) {
        matchers++;
      }
    }
    return matchers;
  }
}
