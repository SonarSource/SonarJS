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
const actionDirectory = path.dirname(currentFilePath);
const repositoryRoot = path.resolve(actionDirectory, '../../..');

const sourceDirectory = path.resolve(repositoryRoot, process.argv[2] ?? '');
const destinationDirectory = path.resolve(repositoryRoot, process.argv[3] ?? '');

if (!process.argv[2] || !process.argv[3]) {
  throw new Error('Usage: node sync-results.mjs <source-results-path> <destination-results-path>');
}

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

/**
 * Sync results from source (<project>/<language>/<ruleId>.json)
 * to destination (<language>/<project>/<ruleId>.json).
 */
await syncTransposed(sourceDirectory, destinationDirectory);

console.log(
  `Synced ${path.relative(repositoryRoot, sourceDirectory)} -> ${path.relative(repositoryRoot, destinationDirectory)}`,
);

async function syncTransposed(source, destination) {
  const projectEntries = await readdir(source, { withFileTypes: true });

  // Collect all language/project/file triples from the source
  const allFiles = new Map(); // key: "<language>/<project>/<file>", value: source path

  for (const projectEntry of projectEntries) {
    if (!projectEntry.isDirectory()) {
      continue;
    }
    const project = projectEntry.name;
    const projectDir = path.join(source, project);
    const langEntries = await readdir(projectDir, { withFileTypes: true });

    for (const langEntry of langEntries) {
      if (!langEntry.isDirectory()) {
        continue;
      }
      const language = langEntry.name;
      const langDir = path.join(projectDir, language);
      const fileEntries = await readdir(langDir, { withFileTypes: true });

      for (const fileEntry of fileEntries) {
        if (fileEntry.isFile()) {
          const destKey = path.join(language, project, fileEntry.name);
          allFiles.set(destKey, path.join(langDir, fileEntry.name));
        }
      }
    }
  }

  // Remove destination files that no longer exist in source
  const destStat = await safeLstat(destination);
  if (destStat?.isDirectory()) {
    const destLangEntries = await readdir(destination, { withFileTypes: true });
    for (const langEntry of destLangEntries) {
      if (!langEntry.isDirectory()) {
        continue;
      }
      const language = langEntry.name;
      const destLangDir = path.join(destination, language);
      const destProjectEntries = await readdir(destLangDir, { withFileTypes: true });
      for (const projectEntry of destProjectEntries) {
        if (!projectEntry.isDirectory()) {
          continue;
        }
        const project = projectEntry.name;
        const destProjectDir = path.join(destLangDir, project);
        const destFileEntries = await readdir(destProjectDir, { withFileTypes: true });
        for (const fileEntry of destFileEntries) {
          if (fileEntry.isFile()) {
            const key = path.join(language, project, fileEntry.name);
            if (!allFiles.has(key)) {
              await rm(path.join(destProjectDir, fileEntry.name), { force: true });
            }
          }
        }
        // Remove empty project directories
        const remaining = await readdir(destProjectDir);
        if (remaining.length === 0) {
          await rm(destProjectDir, { recursive: true, force: true });
        }
      }
    }
  }

  // Copy source files to destination
  for (const [destKey, sourcePath] of allFiles) {
    const destPath = path.join(destination, destKey);
    await mkdir(path.dirname(destPath), { recursive: true });
    await cp(sourcePath, destPath, { force: true, preserveTimestamps: true });
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
