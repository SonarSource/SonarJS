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
import { cp, lstat, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFilePath = fileURLToPath(import.meta.url);
const toolsDirectory = path.dirname(currentFilePath);
const repositoryRoot = path.resolve(toolsDirectory, '..');

const sourceDirectory = path.resolve(repositoryRoot, process.argv[2] ?? 'packages/ruling/actual');
const destinationDirectory = path.resolve(
  repositoryRoot,
  process.argv[3] ?? 'its/ruling/src/test/expected',
);

ensurePathIsInsideRepository(sourceDirectory, 'source');
ensurePathIsInsideRepository(destinationDirectory, 'destination');

if (sourceDirectory === destinationDirectory) {
  throw new Error('Source and destination directories must be different');
}

if (destinationDirectory.startsWith(`${sourceDirectory}${path.sep}`)) {
  throw new Error('Destination directory cannot be nested inside source directory');
}

if (sourceDirectory.startsWith(`${destinationDirectory}${path.sep}`)) {
  throw new Error('Source directory cannot be nested inside destination directory');
}

const sourceStat = await safeLstat(sourceDirectory);
if (!sourceStat?.isDirectory()) {
  throw new Error(`Source directory does not exist or is not a directory: ${sourceDirectory}`);
}

await mirrorDirectory(sourceDirectory, destinationDirectory);

console.log(
  `Mirrored ${path.relative(repositoryRoot, sourceDirectory)} -> ${path.relative(repositoryRoot, destinationDirectory)}`,
);

async function mirrorDirectory(source, destination) {
  await mkdir(destination, { recursive: true });

  const [sourceEntries, destinationEntries] = await Promise.all([
    readdir(source, { withFileTypes: true }),
    readdir(destination, { withFileTypes: true }),
  ]);

  const sourceEntryNames = new Set(sourceEntries.map(entry => entry.name));

  for (const destinationEntry of destinationEntries) {
    if (!sourceEntryNames.has(destinationEntry.name)) {
      await rm(path.join(destination, destinationEntry.name), { recursive: true, force: true });
    }
  }

  for (const sourceEntry of sourceEntries) {
    const sourceEntryPath = path.join(source, sourceEntry.name);
    const destinationEntryPath = path.join(destination, sourceEntry.name);
    const destinationEntryStat = await safeLstat(destinationEntryPath);

    if (sourceEntry.isDirectory()) {
      if (destinationEntryStat && !destinationEntryStat.isDirectory()) {
        await rm(destinationEntryPath, { recursive: true, force: true });
      }
      await mirrorDirectory(sourceEntryPath, destinationEntryPath);
      continue;
    }

    if (destinationEntryStat?.isDirectory()) {
      await rm(destinationEntryPath, { recursive: true, force: true });
    }

    await cp(sourceEntryPath, destinationEntryPath, {
      force: true,
      preserveTimestamps: true,
    });
  }
}

function ensurePathIsInsideRepository(candidatePath, label) {
  const relativePath = path.relative(repositoryRoot, candidatePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`${label} path must be inside repository root: ${candidatePath}`);
  }
}

async function safeLstat(candidatePath) {
  try {
    return await lstat(candidatePath);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}
