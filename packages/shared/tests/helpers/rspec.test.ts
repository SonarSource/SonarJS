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
import { afterEach, describe, it } from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect } from 'expect';
import { readRootRspecShaOverride } from '../../src/helpers/rspec.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(path => rm(path, { force: true, recursive: true })),
  );
});

async function createProjectRoot(overrideContents?: string) {
  const rootDir = await mkdtemp(join(tmpdir(), 'sonarjs-rspec-sha-'));
  temporaryDirectories.push(rootDir);

  if (overrideContents !== undefined) {
    await writeFile(join(rootDir, 'rspec.sha'), overrideContents);
  }

  return rootDir;
}

describe('readRootRspecShaOverride', () => {
  it('should return null when rspec.sha is absent', async () => {
    const projectRoot = await createProjectRoot();

    expect(readRootRspecShaOverride(projectRoot)).toBeNull();
  });

  it('should return the trimmed rspec.sha contents when the file is present', async () => {
    const projectRoot = await createProjectRoot('abc123\n');

    expect(readRootRspecShaOverride(projectRoot)).toBe('abc123');
  });

  it('should reject an empty rspec.sha file', async () => {
    const projectRoot = await createProjectRoot('\n');

    expect(() => readRootRspecShaOverride(projectRoot)).toThrow('rspec.sha is empty');
  });
});
