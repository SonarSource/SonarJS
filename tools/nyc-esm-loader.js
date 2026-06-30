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
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import convertSourceMap from 'convert-source-map';
import loader from '@istanbuljs/load-nyc-config';
import schema from '@istanbuljs/schema';
import InstrumenterIstanbul from 'nyc/lib/instrumenters/istanbul.js';
import SourceMaps from 'nyc/lib/source-maps.js';
import TestExclude from 'test-exclude';

function nycEnvironmentConfig() {
  try {
    return JSON.parse(process.env.NYC_CONFIG);
  } catch {
    return undefined;
  }
}

let nycConfig;
let testExclude;
let instrumenter;
let sourceMaps;

function nycCwd() {
  return process.env.NYC_CWD || process.cwd();
}

function nycCacheDirectory() {
  return nycConfig.cacheDir
    ? resolve(nycConfig.cacheDir)
    : join(nycCwd(), 'node_modules', '.cache', 'nyc');
}

function contentHash(filename, source) {
  return createHash('sha256').update(filename).update('\0').update(source).digest('hex');
}

function contentHashTag(filename, hash) {
  return `;(() => {
  const coverage = globalThis.__coverage__;
  if (coverage?.[${JSON.stringify(filename)}]) {
    coverage[${JSON.stringify(filename)}].contentHash = ${JSON.stringify(hash)};
  }
})();`;
}

function addContentHashTag(instrumented, filename, hash) {
  // nyc's parent reporter reloads source maps from cache using coverage.contentHash.
  const sourceMapComment = '\n//# sourceMappingURL=';
  const sourceMapIndex = instrumented.lastIndexOf(sourceMapComment);
  const tag = '\n' + contentHashTag(filename, hash);
  return sourceMapIndex === -1
    ? instrumented + tag
    : instrumented.slice(0, sourceMapIndex) + tag + instrumented.slice(sourceMapIndex);
}

function assertSourceMapsApi(sourceMaps) {
  if (
    typeof sourceMaps.extract !== 'function' ||
    typeof sourceMaps.registerMap !== 'function'
  ) {
    throw new Error('nyc SourceMaps API changed; ESM coverage remapping cannot continue.');
  }
}

function extractSourceMap(source, filename) {
  try {
    return sourceMaps.extract(source, filename);
  } catch {
    return sourceMapFromFile(source, filename)?.toObject();
  }
}

function sourceMapFromFile(source, filename) {
  try {
    return convertSourceMap.fromMapFileSource(source, sourceMapPath =>
      readFileSync(join(dirname(filename), sourceMapPath)),
    );
  } catch {
    return undefined;
  }
}

export async function load(url, context, nextLoad) {
  if (context.format !== 'module' || loader.isLoading()) {
    return nextLoad(url, context);
  }

  if (!nycConfig) {
    nycConfig = nycEnvironmentConfig() || {
      ...schema.defaults.nyc,
      ...(await loader.loadNycConfig({
        cwd: process.env.NYC_CWD || process.cwd(),
      })),
    };
  }

  if (!testExclude) {
    testExclude = new TestExclude(nycConfig);
    const cacheDirectory = nycCacheDirectory();
    const cache = Boolean(cacheDirectory && nycConfig.cache);
    if (cacheDirectory && cache) {
      mkdirSync(cacheDirectory, { recursive: true });
    }
    sourceMaps = new SourceMaps({ cache, cacheDirectory });
    assertSourceMapsApi(sourceMaps);
    instrumenter = InstrumenterIstanbul({
      compact: nycConfig.compact,
      preserveComments: nycConfig.preserveComments,
      produceSourceMap: nycConfig.produceSourceMap,
      ignoreClassMethods: nycConfig.ignoreClassMethods,
      esModules: true,
      parserPlugins: nycConfig.parserPlugins,
    });
  }

  const filename = fileURLToPath(url);
  if (!testExclude.shouldInstrument(filename)) {
    return nextLoad(url, context);
  }

  const fromNext = await nextLoad(url, context);
  let { source } = fromNext;
  if (typeof source !== 'string') {
    source = new TextDecoder().decode(source);
  }

  const sourceMap = extractSourceMap(source, filename);
  const hash = sourceMap ? contentHash(filename, source) : undefined;
  const instrumented = instrumenter.instrumentSync(source, filename, {
    sourceMap,
    registerMap() {
      sourceMaps.registerMap(filename, hash, sourceMap);
    },
  });

  return {
    format: fromNext.format,
    source: hash ? addContentHashTag(instrumented, filename, hash) : instrumented,
  };
}
