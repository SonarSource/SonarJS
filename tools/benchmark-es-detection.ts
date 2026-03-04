/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
/**
 * Benchmarks ES version detection signals across a directory of JS/TS projects.
 *
 * Usage:
 *   npx tsx tools/benchmark-es-detection.ts [projects-dir]
 *
 * Defaults to its/sources/projects/ if no argument is given.
 * Pass the path to a peachee-js checkout for full corpus analysis.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';

// ---------------------------------------------------------------------------
// Node version → ES year mapping (minimum ES available for that Node major)
// Based on V8 engine support at time of each Node.js LTS release.
// ---------------------------------------------------------------------------
const NODE_TO_ES: [number, number][] = [
  [22, 2024],
  [20, 2023],
  [18, 2022],
  [16, 2021],
  [14, 2020],
  [12, 2019],
  [10, 2018],
  [8, 2017],
];

function nodeVersionToEs(major: number): number {
  for (const [node, es] of NODE_TO_ES) {
    if (major >= node) return es;
  }
  return 2015; // floor for very old Node
}

// ---------------------------------------------------------------------------
// Parse minimum Node major from a semver range string (engines.node or @types/node)
// Examples: ">=18.0.0" → 18, "^20.5.1" → 20, "14.x" → 14, "10.* || >= 12" → 10
// ---------------------------------------------------------------------------
function parseMinNodeMajor(versionStr: string): number | null {
  if (!versionStr || versionStr === '*' || versionStr.startsWith('catalog:')) return null;

  // Extract all numeric major versions from the string
  const nums = [...versionStr.matchAll(/(\d+)(?:\.\d+)*/g)]
    .map(m => parseInt(m[1], 10))
    .filter(n => n > 0 && n < 100); // sanity check: Node majors are 1–99

  if (nums.length === 0) return null;
  return Math.min(...nums);
}

// ---------------------------------------------------------------------------
// Extract ES year from a single lib entry string
// "ES2022" → 2022, "ESNext" → current year, "dom" → null, "ES6" → 2015
// ---------------------------------------------------------------------------
const ESNEXT_YEAR = new Date().getFullYear(); // treat ESNext as current year

function libEntryToEsYear(entry: string): number | null {
  const normalized = entry.toUpperCase().trim();

  if (normalized === 'ESNEXT') return ESNEXT_YEAR;

  // ES<year> pattern: ES2015–ES2025
  const yearMatch = normalized.match(/^ES(20\d{2})$/);
  if (yearMatch) return parseInt(yearMatch[1], 10);

  // Legacy: ES5→2009, ES6→2015, ES7→2016, ES8→2017, ES9→2018
  const legacyMap: Record<string, number> = {
    ES3: 1999,
    ES5: 2009,
    ES6: 2015,
    ES7: 2016,
    ES8: 2017,
    ES9: 2018,
  };
  if (legacyMap[normalized]) return legacyMap[normalized];

  return null;
}

// ---------------------------------------------------------------------------
// Detection result
// ---------------------------------------------------------------------------
type DetectionSource = 'tsconfig.lib' | '@types/node' | 'engines.node' | '.nvmrc';

interface DetectionResult {
  esYear: number;
  source: DetectionSource;
  raw: string; // the raw value that led to this detection
}

// ---------------------------------------------------------------------------
// Find files by name recursively, up to maxDepth
// ---------------------------------------------------------------------------
function findFiles(dir: string, filename: string, maxDepth = 4): string[] {
  const results: string[] = [];
  function walk(current: string, depth: number) {
    if (depth > maxDepth) return;
    let entries: string[];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry === 'node_modules') continue;
      if (entry.startsWith('.') && entry !== filename) continue;
      const full = join(current, entry);
      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        walk(full, depth + 1);
      } else if (entry === filename) {
        results.push(full);
      }
    }
  }
  walk(dir, 0);
  return results;
}

// ---------------------------------------------------------------------------
// Resolve the effective compilerOptions.lib by following extends chains.
// Stops at package references (no relative path) and cycles.
// Returns the lib array from the nearest ancestor that defines it.
// ---------------------------------------------------------------------------
function resolveEffectiveLib(tsconfigPath: string, visited = new Set<string>()): string[] | null {
  const absPath = resolve(tsconfigPath);
  if (visited.has(absPath)) return null;
  visited.add(absPath);

  let parsed: any;
  try {
    parsed = JSON.parse(readFileSync(absPath, 'utf-8'));
  } catch {
    return null;
  }

  // If this file declares lib, use it (child overrides parent)
  const lib: unknown = parsed?.compilerOptions?.lib;
  if (Array.isArray(lib)) return lib as string[];

  // Follow extends if present
  const ext: unknown = parsed?.extends;
  if (typeof ext !== 'string') return null;

  // Skip package references (no ./ or ../)
  if (!ext.startsWith('.')) return null;

  // Resolve the extended path, adding .json if no extension
  const extPath = ext.endsWith('.json') ? ext : `${ext}.json`;
  const resolvedExt = resolve(dirname(absPath), extPath);

  return resolveEffectiveLib(resolvedExt, visited);
}

// ---------------------------------------------------------------------------
// Signal 1: tsconfig.lib (with extends resolution)
// ---------------------------------------------------------------------------
function detectFromTsconfigLib(projectDir: string): DetectionResult | null {
  const tsconfigs = findFiles(projectDir, 'tsconfig.json');
  let bestYear: number | null = null;
  let bestRaw = '';

  for (const tsconfigPath of tsconfigs) {
    const lib = resolveEffectiveLib(tsconfigPath);
    if (!Array.isArray(lib)) continue;

    for (const entry of lib) {
      if (typeof entry !== 'string') continue;
      const year = libEntryToEsYear(entry);
      if (year !== null && (bestYear === null || year > bestYear)) {
        bestYear = year;
        bestRaw = `${entry} (in ${relative(projectDir, tsconfigPath)})`;
      }
    }
  }

  if (bestYear === null) return null;
  return { esYear: bestYear, source: 'tsconfig.lib', raw: bestRaw };
}

// ---------------------------------------------------------------------------
// Signal 2: @types/node in package.json dependencies
// ---------------------------------------------------------------------------
function detectFromTypesNode(projectDir: string): DetectionResult | null {
  const packageJsons = findFiles(projectDir, 'package.json');
  let bestYear: number | null = null;
  let bestRaw = '';

  for (const pkgPath of packageJsons) {
    let pkg: any;
    try {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    } catch {
      continue;
    }

    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
    };

    const typesNodeVersion: unknown = allDeps?.['@types/node'];
    if (typeof typesNodeVersion !== 'string') continue;

    const major = parseMinNodeMajor(typesNodeVersion);
    if (major === null) continue;

    const year = nodeVersionToEs(major);
    if (bestYear === null || year > bestYear) {
      bestYear = year;
      bestRaw = `@types/node@${typesNodeVersion} → Node ${major}`;
    }
  }

  if (bestYear === null) return null;
  return { esYear: bestYear, source: '@types/node', raw: bestRaw };
}

// ---------------------------------------------------------------------------
// Signal 3: engines.node in package.json
// ---------------------------------------------------------------------------
function detectFromEnginesNode(projectDir: string): DetectionResult | null {
  const packageJsons = findFiles(projectDir, 'package.json');
  let bestYear: number | null = null;
  let bestRaw = '';

  for (const pkgPath of packageJsons) {
    let pkg: any;
    try {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    } catch {
      continue;
    }

    const enginesNode: unknown = pkg?.engines?.node;
    if (typeof enginesNode !== 'string') continue;

    const major = parseMinNodeMajor(enginesNode);
    if (major === null) continue;

    const year = nodeVersionToEs(major);
    if (bestYear === null || year > bestYear) {
      bestYear = year;
      bestRaw = `engines.node="${enginesNode}" → Node ${major}`;
    }
  }

  if (bestYear === null) return null;
  return { esYear: bestYear, source: 'engines.node', raw: bestRaw };
}

// ---------------------------------------------------------------------------
// Signal 4: .nvmrc or .node-version files
// ---------------------------------------------------------------------------
function detectFromNvmrc(projectDir: string): DetectionResult | null {
  for (const filename of ['.nvmrc', '.node-version']) {
    const files = findFiles(projectDir, filename, 2);
    for (const file of files) {
      let content: string;
      try {
        content = readFileSync(file, 'utf-8').trim();
      } catch {
        continue;
      }
      // Strip leading 'v', e.g. "v22.12.0" → "22.12.0"
      const version = content.replace(/^v/, '');
      const major = parseMinNodeMajor(version);
      if (major === null) continue;
      const year = nodeVersionToEs(major);
      return { esYear: year, source: '.nvmrc', raw: `${filename}="${content}" → Node ${major}` };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Combined detection (priority: tsconfig.lib > @types/node > engines.node > .nvmrc)
// ---------------------------------------------------------------------------
function detectEsVersion(projectDir: string): DetectionResult | null {
  return (
    detectFromTsconfigLib(projectDir) ??
    detectFromTypesNode(projectDir) ??
    detectFromEnginesNode(projectDir) ??
    detectFromNvmrc(projectDir)
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const { values, positionals } = parseArgs({
  options: { verbose: { type: 'boolean', short: 'v', default: false } },
  allowPositionals: true,
  strict: false,
});

const projectsDir = positionals[0] ?? 'its/sources/projects';

if (!existsSync(projectsDir)) {
  console.error(`Directory not found: ${projectsDir}`);
  process.exit(1);
}

const projects = readdirSync(projectsDir).filter(name => {
  try {
    const dir = join(projectsDir, name);
    if (!statSync(dir).isDirectory()) return false;
    // Only treat as a project if it has checkout.sh and a non-empty workspace/
    if (!existsSync(join(dir, 'checkout.sh'))) return false;
    const workspaceDir = join(dir, 'workspace');
    return existsSync(workspaceDir) && readdirSync(workspaceDir).length > 0;
  } catch {
    return false;
  }
});

console.log(`\nES Version Detection Benchmark`);
console.log(`Directory: ${projectsDir}`);
console.log(`Projects: ${projects.length}\n`);

const rows: Array<{
  project: string;
  result: DetectionResult | null;
  signals: {
    lib: DetectionResult | null;
    types: DetectionResult | null;
    engines: DetectionResult | null;
    nvmrc: DetectionResult | null;
  };
}> = [];

for (const project of projects) {
  const dir = join(projectsDir, project);
  const lib = detectFromTsconfigLib(dir);
  const types = detectFromTypesNode(dir);
  const engines = detectFromEnginesNode(dir);
  const nvmrc = detectFromNvmrc(dir);
  const result = lib ?? types ?? engines ?? nvmrc;
  rows.push({ project, result, signals: { lib, types, engines, nvmrc } });
}

// Coverage stats
const detected = rows.filter(r => r.result !== null);
const bySource: Record<DetectionSource | 'none', number> = {
  'tsconfig.lib': 0,
  '@types/node': 0,
  'engines.node': 0,
  '.nvmrc': 0,
  none: 0,
};
for (const row of rows) {
  bySource[row.result?.source ?? 'none']++;
}

const esYearDist: Record<number, number> = {};
for (const row of detected) {
  const year = row.result!.esYear;
  esYearDist[year] = (esYearDist[year] ?? 0) + 1;
}

// Coverage table
console.log('── Coverage ────────────────────────────────────────');
console.log(`  Total projects:              ${projects.length}`);
console.log(
  `  Detected (any signal):       ${detected.length} (${pct(detected.length, projects.length)}%)`,
);
console.log(
  `  Not detected:                ${bySource.none} (${pct(bySource.none, projects.length)}%)`,
);
console.log('');
console.log('── By primary signal ───────────────────────────────');
console.log(
  `  tsconfig.lib:                ${bySource['tsconfig.lib']} (${pct(bySource['tsconfig.lib'], projects.length)}%)`,
);
console.log(
  `  @types/node:                 ${bySource['@types/node']} (${pct(bySource['@types/node'], projects.length)}%)`,
);
console.log(
  `  engines.node:                ${bySource['engines.node']} (${pct(bySource['engines.node'], projects.length)}%)`,
);
console.log(
  `  .nvmrc/.node-version:        ${bySource['.nvmrc']} (${pct(bySource['.nvmrc'], projects.length)}%)`,
);
console.log('');
console.log('── Individual signal presence ──────────────────────');
const hasLib = rows.filter(r => r.signals.lib !== null).length;
const hasTypes = rows.filter(r => r.signals.types !== null).length;
const hasEngines = rows.filter(r => r.signals.engines !== null).length;
const hasNvmrc = rows.filter(r => r.signals.nvmrc !== null).length;
console.log(`  Has tsconfig.lib signal:     ${hasLib} (${pct(hasLib, projects.length)}%)`);
console.log(`  Has @types/node signal:      ${hasTypes} (${pct(hasTypes, projects.length)}%)`);
console.log(`  Has engines.node signal:     ${hasEngines} (${pct(hasEngines, projects.length)}%)`);
console.log(`  Has .nvmrc/.node-version:    ${hasNvmrc} (${pct(hasNvmrc, projects.length)}%)`);
console.log('');
console.log('── ES Year distribution (detected projects) ────────');
for (const year of Object.keys(esYearDist).map(Number).sort()) {
  const count = esYearDist[year];
  const bar = '█'.repeat(Math.round((count / detected.length) * 30));
  console.log(`  ES${year}: ${String(count).padStart(3)}  ${bar}`);
}
console.log('');

if (values.verbose) {
  console.log('── Per-project results ─────────────────────────────');
  const colW = Math.max(...rows.map(r => r.project.length)) + 2;
  for (const row of rows) {
    const { project, result, signals } = row;
    const primary = result ? `ES${result.esYear}  [${result.source}]  ${result.raw}` : '—';
    console.log(`  ${project.padEnd(colW)} ${primary}`);
    // Show all signals found, even those not chosen as primary
    const allSignals: [string, DetectionResult | null][] = [
      ['tsconfig.lib', signals.lib],
      ['@types/node', signals.types],
      ['engines.node', signals.engines],
      ['.nvmrc', signals.nvmrc],
    ];
    for (const [name, sig] of allSignals) {
      if (sig && sig.source !== result?.source) {
        console.log(`  ${''.padEnd(colW)} (also: [${name}] ES${sig.esYear}  ${sig.raw})`);
      }
    }
  }
  console.log('');

  console.log('── Not detected ────────────────────────────────────');
  for (const row of rows.filter(r => r.result === null)) {
    console.log(`  ${row.project}`);
  }
  console.log('');
}

function pct(n: number, total: number) {
  return Math.round((n / total) * 100);
}
