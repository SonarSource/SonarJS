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
import { readFile } from 'node:fs/promises';

const [, , npmBomPath, mergedBomPath, esbuildMetafilePath] = process.argv;

if (esbuildMetafilePath === undefined) {
  throw new Error(
    'Usage: node tools/validate-cyclonedx-bom.mjs <npm-bom> <merged-bom> <esbuild-metafile>',
  );
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new Error(`Could not read JSON from ${path}`, { cause: error });
  }
}

function collectPurls(bom) {
  const purls = new Set();

  function visit(component) {
    if (typeof component?.purl === 'string') {
      purls.add(component.purl);
    }
    for (const child of component?.components ?? []) {
      visit(child);
    }
  }

  visit(bom.metadata?.component);
  for (const component of bom.components ?? []) {
    visit(component);
  }
  return purls;
}

function npmPackageName(purl) {
  if (!purl.startsWith('pkg:npm/')) {
    return undefined;
  }
  const versionSeparator = purl.lastIndexOf('@');
  if (versionSeparator < 'pkg:npm/'.length) {
    throw new Error(`Invalid npm package URL: ${purl}`);
  }
  return decodeURIComponent(purl.slice('pkg:npm/'.length, versionSeparator));
}

function bundledPackageNames(metafile) {
  const names = new Set();
  for (const input of Object.keys(metafile.inputs ?? {})) {
    const matches = [...input.matchAll(/(?:^|[\\/])node_modules[\\/]((?:@[^\\/]+[\\/])?[^\\/]+)/g)];
    if (matches.length > 0) {
      names.add(matches.at(-1)[1].replaceAll('\\', '/'));
    }
  }
  return names;
}

const [npmBom, mergedBom, esbuildMetafile] = await Promise.all([
  readJson(npmBomPath),
  readJson(mergedBomPath),
  readJson(esbuildMetafilePath),
]);

const npmPurls = collectPurls(npmBom);
const mergedPurls = collectPurls(mergedBom);
const npmPackageNames = new Set([...npmPurls].map(npmPackageName).filter(Boolean));
const bundledPackages = bundledPackageNames(esbuildMetafile);

if (npmPackageNames.size === 0) {
  throw new Error(`No pkg:npm components found in ${npmBomPath}`);
}

const omittedBundledPackages = [...bundledPackages]
  .filter(packageName => !npmPackageNames.has(packageName))
  .sort();
if (omittedBundledPackages.length > 0) {
  throw new Error(
    `The npm BOM omits packages bundled by esbuild:\n${omittedBundledPackages.join('\n')}`,
  );
}

const omittedMergedPurls = [...npmPurls].filter(purl => !mergedPurls.has(purl)).sort();
if (omittedMergedPurls.length > 0) {
  throw new Error(`The merged BOM omits npm package URLs:\n${omittedMergedPurls.join('\n')}`);
}

console.log(
  `CycloneDX coverage verified: ${bundledPackages.size} bundled npm packages, ` +
    `${npmPackageNames.size} npm BOM packages, ${npmPurls.size} npm package URLs`,
);
