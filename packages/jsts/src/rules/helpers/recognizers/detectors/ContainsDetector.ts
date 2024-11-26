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

export default class ContainsDetector extends Detector {
  strings: (string | RegExp)[];

  constructor(probability: number, ...strings: (string | RegExp)[]) {
    super(probability);
    this.strings = strings;
  }

  scan(line: string): number {
    const lineWithoutSpaces = line.replace(/\s+/, '');
    let matchers = 0;
    for (const str of this.strings) {
      let regex = str;
      if (typeof str === 'string') {
        regex = new RegExp(escapeRegex(str), 'g');
      }
      matchers += (lineWithoutSpaces.match(regex) ?? []).length;
    }
    return matchers;
  }
}

function escapeRegex(value: string) {
  return value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}
