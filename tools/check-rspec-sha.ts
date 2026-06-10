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
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const DEFAULT_ERROR_MESSAGE = 'Failed to evaluate root rspec.sha override.';

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

function getErrorMessage(error: unknown) {
  if (typeof error === 'string') {
    return error;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return DEFAULT_ERROR_MESSAGE;
}

export function run(projectRoot = ROOT_DIR) {
  const pinnedSha = readRootRspecShaOverride(projectRoot);

  if (pinnedSha === null) {
    console.log('No root rspec.sha override found.');
  } else {
    console.error(
      `Root rspec.sha override found (${pinnedSha.slice(0, 8)}). Remove rspec.sha before merging into master.`,
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === __filename) {
  try {
    run();
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    process.exitCode = 1;
  }
}
