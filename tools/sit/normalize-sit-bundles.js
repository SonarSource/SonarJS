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
import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { isMain, parseOptionArgs, requireOption, resolvePathUnder } from './common.js';

export async function normalizeSitBundles({ inputDir, outputDir }) {
  if (!(await isDirectory(inputDir))) {
    throw new Error(`SIT input directory does not exist: ${inputDir}`);
  }

  await mkdir(outputDir, { recursive: true });
  const bundles = await discoverBundles(inputDir);
  if (bundles.length === 0) {
    throw new Error(`No valid SIT bundles found under ${inputDir}`);
  }

  const bundleNames = [];
  for (const bundle of bundles) {
    const destination = join(outputDir, bundle.name);
    await rm(destination, { recursive: true, force: true });
    await cp(bundle.path, destination, { recursive: true });
    await mkdir(join(destination, 'sources'), { recursive: true });
    bundleNames.push(bundle.name);
  }

  return { bundleCount: bundles.length, bundleNames };
}

async function discoverBundles(inputDir) {
  const bundles = [];
  const entries = (await readdir(inputDir, { withFileTypes: true }))
    .filter(entry => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const child = join(inputDir, entry.name);
    if (await isBundleDir(child)) {
      bundles.push({ name: entry.name, path: child });
      continue;
    }

    const nestedEntries = (await readdir(child, { withFileTypes: true }))
      .filter(nestedEntry => nestedEntry.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const nestedEntry of nestedEntries) {
      const nested = join(child, nestedEntry.name);
      if (await isBundleDir(nested)) {
        bundles.push({ name: `${entry.name}__${nestedEntry.name}`, path: nested });
      }
    }
  }
  return bundles;
}

async function isBundleDir(path) {
  return (await isFile(join(path, 'metadata.json'))) && (await isFile(join(path, 'issues.jsonl')));
}

async function isDirectory(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function main() {
  const args = parseOptionArgs(process.argv);
  const cwd = process.cwd();
  const result = await normalizeSitBundles({
    inputDir: resolvePathUnder(cwd, requireOption(args, '--input-dir'), '--input-dir'),
    outputDir: resolvePathUnder(cwd, requireOption(args, '--output-dir'), '--output-dir'),
  });
  console.log(`Prepared ${result.bundleCount} bundle(s) for FPS`);
  for (const bundleName of result.bundleNames) {
    console.log(`Prepared bundle: ${bundleName}`);
  }
}

if (isMain(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
