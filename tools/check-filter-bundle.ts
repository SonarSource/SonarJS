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
import fs from 'node:fs/promises';
import path from 'node:path';
import { filterBundle } from '../packages/analysis/src/common/filter/filter-bundle.js';
import { normalizeToAbsolutePath } from '../packages/shared/src/helpers/files.js';

type Result = 'accepted' | 'excluded' | 'missing';

function printUsage() {
  console.error('Usage: tsx tools/check-filter-bundle.ts <file-list.txt>');
  console.error('');
  console.error('Each non-empty line in <file-list.txt> must contain one file path.');
  console.error('Lines starting with "#" are ignored.');
  console.error('Relative paths are resolved from the current working directory.');
  console.error('Only files excluded by filterBundle() are printed to stdout.');
}

function resolveListedPath(rawPath: string) {
  return normalizeToAbsolutePath(
    path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath),
  );
}

async function loadFileList(fileListPath: string) {
  const content = await fs.readFile(fileListPath, 'utf8');
  return content
    .split(/\r?\n/u)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));
}

async function checkFile(filePath: string): Promise<Result> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return filterBundle(resolveListedPath(filePath), content) ? 'accepted' : 'excluded';
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return 'missing';
    }
    throw error;
  }
}

async function main() {
  const fileListArg = process.argv[2];
  if (!fileListArg || process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    process.exit(fileListArg ? 0 : 1);
  }

  const fileListPath = path.resolve(process.cwd(), fileListArg);
  const listedPaths = await loadFileList(fileListPath);

  let accepted = 0;
  let excluded = 0;
  let missing = 0;

  for (const listedPath of listedPaths) {
    const resolvedPath = resolveListedPath(listedPath);
    const result = await checkFile(resolvedPath);
    if (result === 'accepted') {
      accepted++;
    } else if (result === 'excluded') {
      excluded++;
    } else {
      missing++;
    }
    if (result === 'excluded') {
      console.log(listedPath);
    } else if (result === 'missing') {
      console.error(`missing\t${listedPath}`);
    }
  }

  console.error(`Summary\taccepted=${accepted}\texcluded=${excluded}\tmissing=${missing}`);
}

await main();
