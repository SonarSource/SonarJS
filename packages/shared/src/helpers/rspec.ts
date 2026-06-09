/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify it under the terms of
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
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function readRootRspecShaOverride(projectRoot: string) {
  const overrideFile = join(projectRoot, 'rspec.sha');
  if (!existsSync(overrideFile)) {
    return null;
  }

  const pinnedSha = readFileSync(overrideFile, 'utf-8').trim();
  if (!pinnedSha) {
    throw new Error('rspec.sha is empty');
  }

  return pinnedSha;
}
