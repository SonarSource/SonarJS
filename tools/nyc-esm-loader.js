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
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import convertSourceMap from 'convert-source-map';
import loader from '@istanbuljs/load-nyc-config';
import schema from '@istanbuljs/schema';
import InstrumenterIstanbul from 'nyc/lib/instrumenters/istanbul.js';
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

  const sourceMap = (
    convertSourceMap.fromSource(source) ?? sourceMapFromFile(source, filename)
  )?.toObject();
  const instrumented = instrumenter.instrumentSync(source, filename, {
    sourceMap,
    registerMap() {},
  });

  return {
    format: fromNext.format,
    source: instrumented,
  };
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
