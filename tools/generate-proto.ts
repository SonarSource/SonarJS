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
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const pbjs = require('protobufjs-cli/pbjs');
const pbts = require('protobufjs-cli/pbts');

const ROOT = path.resolve(import.meta.dirname, '..');
const ES6_WRAPPER = path.join(ROOT, 'packages/grpc/src/proto/es6-wrapper.js');

const PROTO_FILES = [
  {
    proto: 'packages/grpc/src/proto/language_analyzer.proto',
    js: 'packages/grpc/src/proto/language_analyzer.js',
    dts: 'packages/grpc/src/proto/language_analyzer.d.ts',
  },
  {
    proto: 'packages/grpc/src/proto/health.proto',
    js: 'packages/grpc/src/proto/health.js',
    dts: 'packages/grpc/src/proto/health.d.ts',
  },
  {
    proto: 'packages/jsts/src/parsers/estree.proto',
    js: 'packages/jsts/src/parsers/estree.js',
    dts: 'packages/jsts/src/parsers/estree.d.ts',
  },
];

function runPbjs(proto: string, output: string): Promise<void> {
  return new Promise((resolve, reject) => {
    pbjs.main(
      ['-t', 'static-module', '-w', ES6_WRAPPER, '--es6', '-o', output, proto],
      (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      },
    );
  });
}

function runPbts(jsFile: string, output: string): Promise<void> {
  return new Promise((resolve, reject) => {
    pbts.main(['-o', output, jsFile], (err: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

for (const { proto, js, dts } of PROTO_FILES) {
  const protoPath = path.join(ROOT, proto);
  const jsPath = path.join(ROOT, js);
  const dtsPath = path.join(ROOT, dts);

  console.log(`Generating ${js} from ${proto}`);
  await runPbjs(protoPath, jsPath);

  console.log(`Generating ${dts} from ${js}`);
  await runPbts(jsPath, dtsPath);
}

console.log('Proto generation complete.');
