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
export default abstract class Detector {
  probability: number;

  constructor(probability: number) {
    if (probability < 0 || probability > 1) {
      throw new Error('probability should be between [0 .. 1]');
    }
    this.probability = probability;
  }

  abstract scan(line: string): number;

  recognition(line: string): number {
    const matchers = this.scan(line);
    if (matchers === 0) {
      return 0;
    } else {
      return 1 - Math.pow(1 - this.probability, matchers);
    }
  }
}
