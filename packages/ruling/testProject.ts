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
import { join, basename } from 'node:path/posix';
import { writeResults } from './lits.js';
import projects from './projects.json' with { type: 'json' };
import { analyzeProject } from '../jsts/src/analysis/projectAnalysis/analyzeProject.js';
import { toUnixPath } from '../shared/src/helpers/files.js';
import { compare, Result } from 'dir-compare';
import { RuleConfig } from '../jsts/src/linter/config/rule-config.js';
import { expect } from 'expect';
import * as metas from '../jsts/src/rules/metas.js';
import { SonarMeta } from '../jsts/src/rules/helpers/index.js';
import { symlink } from 'node:fs/promises';
import {
  initFsCache,
  setActiveProject,
  loadProjectCache,
  saveProjectCache,
  getFsCacheStats,
  getProjectCacheInfo,
  type CacheStats,
} from '../shared/src/fs-cache/index.js';

const currentPath = toUnixPath(import.meta.dirname);

const SONARJS_ROOT = join(currentPath, '..', '..');
const sourcesPath = join(SONARJS_ROOT, '..', 'sonarjs-ruling-sources');
const jsTsProjectsPath = join(sourcesPath, 'jsts', 'projects');
const expectedPathBase = join(SONARJS_ROOT, 'its', 'ruling', 'src', 'test', 'expected', 'jsts');
const actualPathBase = join(currentPath, 'actual', 'jsts');
const fsCacheDir = join(currentPath, 'caches');

// Environment variables for cache control:
// FS_CACHE=0 or FS_CACHE=false: disable fs caching entirely (baseline mode)
// FS_CACHE=cold: enable caching but don't load existing cache (cold start)
// FS_CACHE=1 or unset: enable caching with warm start (default)
//
// Usage examples:
//   FS_CACHE=0 npx tsx --test ...     # baseline - no caching
//   FS_CACHE=cold npx tsx --test ...  # cold start - caching enabled, no cache load
//   npx tsx --test ...                # warm start - caching enabled, load cache
const fsCacheEnv = process.env.FS_CACHE?.toLowerCase() ?? '1';
const FS_CACHE_ENABLED = fsCacheEnv !== '0' && fsCacheEnv !== 'false';
const COLD_CACHE = fsCacheEnv === 'cold';

// Initialize fs-cache if enabled
if (FS_CACHE_ENABLED) {
  initFsCache({ memoryThreshold: 500 * 1024 * 1024 });
  console.log(`🗂️  FS Cache: enabled${COLD_CACHE ? ' (cold start)' : ' (warm start)'}`);
} else {
  console.log('🗂️  FS Cache: disabled (baseline mode)');
}

await symlink(join(SONARJS_ROOT, 'its', 'sources'), sourcesPath).catch(err => {
  if (err.code !== 'EEXIST') {
    throw err;
  }
});

const DEFAULT_EXCLUSIONS = ['**/.*', '**/*.d.ts'];

type ProjectsData = {
  name: string;
  folder?: string;
  testDir: string | null;
  exclusions: string | null;
};

export function projectName(projectFile: string) {
  const filename = basename(toUnixPath(projectFile));
  return filename.substring(0, filename.length - '.ruling.test.ts'.length);
}

export async function testProject(projectName: string) {
  const { folder, name, exclusions, testDir } = (projects as ProjectsData[]).find(
    p => p.name === projectName,
  )!;
  const rules = Object.entries(metas)
    .flatMap(([key, meta]: [string, SonarMeta]): RuleConfig[] => {
      return meta.languages.map(language => ({
        key,
        configurations: [],
        language,
        fileTypeTargets: meta.scope === 'Tests' ? ['TEST'] : ['MAIN'],
        analysisModes: ['DEFAULT'],
        blacklistedExtensions: meta.blacklistedExtensions,
      }));
    })
    .map(applyRulingConfig);
  const expectedPath = join(expectedPathBase, name);
  const actualPath = join(actualPathBase, name);

  const baseDir = join(jsTsProjectsPath, folder ?? name);

  let loadTime = 0;
  let cacheLoaded = false;

  // Set active project for fs-cache and try to load existing cache (if enabled)
  if (FS_CACHE_ENABLED) {
    setActiveProject(name, baseDir, fsCacheDir);

    if (!COLD_CACHE) {
      const loadStart = performance.now();
      cacheLoaded = await loadProjectCache(name, fsCacheDir);
      loadTime = performance.now() - loadStart;

      if (cacheLoaded) {
        const info = getProjectCacheInfo();
        const lt = info?.lastLoadTiming;
        console.log(`📂 Loaded cache for "${name}": ${info?.diskNodeCount} nodes from disk`);
        if (lt) {
          console.log(
            `   Load timing: gunzip=${lt.gunzip.toFixed(1)}ms, decode=${lt.decode.toFixed(1)}ms, total=${lt.total.toFixed(1)}ms`,
          );
        }
      } else {
        console.log(`📂 No existing cache for "${name}" (checked in ${loadTime.toFixed(1)}ms)`);
      }
    } else {
      console.log(`📂 Cold cache mode - skipping cache load for "${name}"`);
    }
  }

  const analysisStart = performance.now();
  const results = await analyzeProject({
    rules,
    configuration: {
      baseDir,
      tests: testDir ? [testDir] : undefined,
      exclusions: exclusions
        ? DEFAULT_EXCLUSIONS.concat(exclusions.split(','))
        : DEFAULT_EXCLUSIONS,
    },
  });

  const analysisTime = performance.now() - analysisStart;

  let saveTime = 0;

  // Print fs-cache stats and save cache (if enabled)
  if (FS_CACHE_ENABLED) {
    const stats = getFsCacheStats();
    if (stats) {
      printCacheStats(name, stats, analysisTime);
    }
    const finalInfo = getProjectCacheInfo();

    const saveStart = performance.now();
    await saveProjectCache(name, fsCacheDir);
    saveTime = performance.now() - saveStart;

    // Get updated info with timing after save
    const afterSaveInfo = getProjectCacheInfo();
    const ft = afterSaveInfo?.lastFlushTiming;

    console.log(`\n⏱️  Timing Summary:`);
    if (!COLD_CACHE) {
      console.log(`   Cache load:     ${loadTime.toFixed(1)}ms`);
      if (cacheLoaded) {
        const lt = finalInfo?.lastLoadTiming;
        if (lt) {
          console.log(`     ├─ gunzip:    ${lt.gunzip.toFixed(1)}ms`);
          console.log(`     └─ decode:    ${lt.decode.toFixed(1)}ms`);
        }
      }
    }
    console.log(`   Analysis:       ${analysisTime.toFixed(1)}ms`);
    console.log(`   Cache save:     ${saveTime.toFixed(1)}ms`);
    if (ft) {
      console.log(`     ├─ build:     ${ft.build.toFixed(1)}ms`);
      console.log(`     ├─ encode:    ${ft.encode.toFixed(1)}ms`);
      console.log(`     └─ gzip+write:${ft.gzip.toFixed(1)}ms`);
    }
    console.log(`   Total:          ${(loadTime + analysisTime + saveTime).toFixed(1)}ms`);
    console.log(
      `   Nodes: ${finalInfo?.nodeCount} in memory, ${finalInfo?.diskNodeCount} from disk`,
    );
    if (afterSaveInfo?.diskSize) {
      console.log(`   Cache file: ${(afterSaveInfo.diskSize / 1024).toFixed(0)} KB`);
    }
  } else {
    // No cache - just show analysis time
    console.log(`\n⏱️  Timing Summary:`);
    console.log(`   Analysis:       ${analysisTime.toFixed(1)}ms`);
  }

  await writeResults(baseDir, name, results, actualPath);

  return await compare(expectedPath, actualPath, { compareContent: true });
}

export function ok(diff: Result) {
  expect(
    JSON.stringify(
      diff.diffSet!.filter(value => value.state !== 'equal'),
      null,
      2,
    ),
  ).toEqual('[]');
}

function printCacheStats(projectName: string, stats: CacheStats, analysisTimeMs: number) {
  const totalHits = stats.hits;
  const totalMisses = stats.misses;
  const totalCached = totalHits + totalMisses;
  const hitRate = totalCached > 0 ? ((totalHits / totalCached) * 100).toFixed(1) : '0.0';

  // Count uncached operations
  let totalUncached = 0;
  for (const count of stats.uncached.values()) {
    totalUncached += count;
  }

  const totalAll = totalCached + totalUncached;

  // Estimate time per operation (rough estimates based on typical SSD/NVMe performance)
  // stat: ~0.1ms, readFile: ~0.5ms average, readdir: ~0.2ms
  const estimatedTimeSavedMs =
    stats.operations.stat.hits * 0.1 +
    stats.operations.readFile.hits * 0.5 +
    stats.operations.readdir.hits * 0.2 +
    stats.operations.realpath.hits * 0.1 +
    stats.operations.access.hits * 0.05 +
    stats.operations.exists.hits * 0.05 +
    stats.operations.opendir.hits * 0.2;

  console.log(`\n📊 FS Cache Stats for "${projectName}":`);
  console.log(`   Total: ${totalAll} fs operations`);
  console.log(
    `   Cached: ${totalCached} (${totalHits} hits, ${totalMisses} misses) - ${hitRate}% hit rate`,
  );
  console.log(`   Uncached: ${totalUncached} (passthrough)`);
  console.log(`   Disk I/O: ${stats.diskReads} reads, ${stats.diskWrites} writes`);
  console.log(
    `   Estimated time saved: ~${estimatedTimeSavedMs.toFixed(0)}ms (${((estimatedTimeSavedMs / analysisTimeMs) * 100).toFixed(1)}% of analysis time)`,
  );

  // Print cached operations
  console.log(`   Cached operations:`);
  for (const [op, opStats] of Object.entries(stats.operations)) {
    const opTotal = opStats.hits + opStats.misses;
    if (opTotal > 0) {
      const opHitRate = ((opStats.hits / opTotal) * 100).toFixed(1);
      console.log(
        `     ${op}: ${opTotal} (${opStats.hits} hits, ${opStats.misses} misses, ${opHitRate}%)`,
      );
    }
  }

  // Print uncached operations
  if (stats.uncached.size > 0) {
    console.log(`   Uncached operations:`);
    const sortedUncached = [...stats.uncached.entries()].sort((a, b) => b[1] - a[1]);
    for (const [op, count] of sortedUncached) {
      console.log(`     ${op}: ${count}`);
    }
  }

  // Print caller stats
  if (stats.callers && stats.callers.size > 0) {
    console.log(`\n   📦 Top callers by package:`);
    const sortedCallers = [...stats.callers.entries()]
      .sort((a, b) => b[1].calls - a[1].calls)
      .slice(0, 15);

    for (const [caller, callerStats] of sortedCallers) {
      const opBreakdown = [...callerStats.operations.entries()]
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([op, count]) => `${op}:${count}`)
        .join(', ');
      console.log(`     ${caller}: ${callerStats.calls} calls (${opBreakdown})`);
    }
  }
}

/**
 * Apply the non-default configuration for some rules
 */
function applyRulingConfig(rule: RuleConfig) {
  switch (rule.key) {
    case 'S1451': {
      if (rule.language === 'js') {
        rule.configurations.push({
          headerFormat: String.raw`// Copyright 20\d\d The Closure Library Authors. All Rights Reserved.`,
          isRegularExpression: true,
        });
      } else {
        rule.configurations.push({
          headerFormat: '//.*',
          isRegularExpression: true,
        });
      }
      break;
    }
    case 'S124': {
      rule.configurations.push({
        regularExpression: '.*TODO.*',
        flags: 'i',
      });
      break;
    }
    case 'S1192': {
      if (rule.language === 'js') {
        rule.configurations.push({
          threshold: 4,
        });
      }
      break;
    }
  }
  return rule;
}
