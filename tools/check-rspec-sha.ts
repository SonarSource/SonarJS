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
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRootRspecShaOverride } from '../packages/shared/src/helpers/rspec.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

try {
  const pinnedSha = readRootRspecShaOverride(ROOT_DIR);

  if (pinnedSha === null) {
    console.log('No root rspec.sha override found.');
  } else {
    console.error(
      `Root rspec.sha override found (${pinnedSha.slice(0, 8)}). Remove rspec.sha before merging into master.`,
    );
    process.exitCode = 1;
  }
} catch (error: any) {
  console.error(error?.message ?? 'Failed to evaluate root rspec.sha override.');
  process.exitCode = 1;
}
