/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import type { GeneratedSourceDetector } from '../contracts.js';

const generatedSourceDetectors: GeneratedSourceDetector[] = [];

export const GENERATED_SOURCE_DETECTORS =
  generatedSourceDetectors as readonly GeneratedSourceDetector[];

export const GENERATED_SOURCE_WATCHED_FILENAMES =
  collectGeneratedSourceWatchedFilenames(generatedSourceDetectors);

function collectGeneratedSourceWatchedFilenames(detectors: Iterable<GeneratedSourceDetector>) {
  const watchedFilenames = new Set<string>();
  for (const detector of detectors) {
    for (const watchedFilename of detector.watchedFilenames ?? []) {
      watchedFilenames.add(watchedFilename);
    }
  }

  return [...watchedFilenames].sort((left, right) => left.localeCompare(right));
}
