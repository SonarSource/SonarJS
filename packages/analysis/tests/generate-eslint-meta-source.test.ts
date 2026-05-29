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
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { dirname, join } from 'node:path/posix';
import { existsSync, readFileSync } from 'node:fs';

function getGeneratorSourcePath(
  testDirectory: string,
  fileExists: (path: string) => boolean = existsSync,
) {
  let currentDirectory = testDirectory;

  while (true) {
    const candidatePath = join(currentDirectory, 'tools/generate-eslint-meta.ts');

    if (fileExists(candidatePath)) {
      return candidatePath;
    }

    const parentDirectory = dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      throw new Error(`Could not resolve generator source path from ${testDirectory}`);
    }

    currentDirectory = parentDirectory;
  }
}

const generatorSource = readFileSync(getGeneratorSourcePath(import.meta.dirname), 'utf8');

describe('generate-eslint-meta source of truth', () => {
  it('should locate the generator source from source-mode tests', () => {
    const generatorSourcePath = '/repo/tools/generate-eslint-meta.ts';

    expect(
      getGeneratorSourcePath('/repo/packages/analysis/tests', path => path === generatorSourcePath),
    ).toBe(generatorSourcePath);
  });

  it('should locate the generator source from compiled JS tests', () => {
    const generatorSourcePath = '/repo/tools/generate-eslint-meta.ts';

    expect(
      getGeneratorSourcePath(
        '/repo/lib/packages/analysis/tests',
        path => path === generatorSourcePath,
      ),
    ).toBe(generatorSourcePath);
  });

  it('should derive generated-source suppression from RSPEC tags', () => {
    expect(generatorSource).toContain("'editable-source'");
  });
});
