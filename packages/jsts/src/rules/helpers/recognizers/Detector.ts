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
