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
import Detector from '../Dectector';

export default class KeywordsDetector extends Detector {
  keywords: string[];
  toUppercase: boolean = false;

  constructor(probability: number, toUppercase: boolean = false, ...keywords: string[]) {
    super(probability);
    this.keywords = keywords;
    if (toUppercase !== undefined) {
      this.toUppercase = toUppercase;
    }
  }

  scan(line: string): number {
    let matchers = 0;
    if (this.toUppercase) {
      line = line.toUpperCase();
    }
    const words = line.split(/[ \t(),{}]/);
    for (const word of words) {
      if (this.keywords.includes(word)) {
        matchers++;
      }
    }
    return matchers;
  }
}
