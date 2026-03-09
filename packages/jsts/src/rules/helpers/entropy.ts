/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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

export function shannonEntropy(str: string): number {
  if (!str) {
    return 0;
  }
  const len = str.length;
  const occurrences: Record<string, number> = {};
  for (const ch of str) {
    occurrences[ch] = (occurrences[ch] ?? 0) + 1;
  }
  return (
    Object.values(occurrences)
      .map(count => count / len)
      .map(freq => -freq * Math.log(freq))
      .reduce((acc, e) => acc + e, 0) / Math.log(2)
  );
}
