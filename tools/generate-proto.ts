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
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const pbjs = require('protobufjs-cli/pbjs');
const pbts = require('protobufjs-cli/pbts');

const ROOT = path.resolve(import.meta.dirname, '..');

const LICENSE_HEADER = fs.readFileSync(path.join(ROOT, 'tools/header.ts'), 'utf-8');

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
    pbjs.main(['-t', 'static-module', '-w', 'es6', '-o', output, proto], (err: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
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

/**
 * The built-in es6 wrapper generates `import * as $protobuf from "protobufjs/minimal"`
 * which breaks at runtime because protobufjs/minimal is a CJS module — `import * as`
 * creates a namespace object where `.roots` is undefined. We fix this to use a default
 * import which correctly gets the CJS module.exports object.
 */
function fixCjsImport(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fixed = content.replace(
    'import * as $protobuf from "protobufjs/minimal"',
    'import $protobuf from "protobufjs/minimal.js"',
  );
  fs.writeFileSync(filePath, fixed);
}

function prependLicenseHeader(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (!content.startsWith('/*')) {
    fs.writeFileSync(filePath, LICENSE_HEADER + content);
  } else {
    // pbjs prepends an eslint-disable comment; insert license after it
    const firstNewline = content.indexOf('\n');
    const eslintLine = content.slice(0, firstNewline + 1);
    const rest = content.slice(firstNewline + 1);
    fs.writeFileSync(filePath, eslintLine + LICENSE_HEADER + rest);
  }
}

for (const { proto, js, dts } of PROTO_FILES) {
  const protoPath = path.join(ROOT, proto);
  const jsPath = path.join(ROOT, js);
  const dtsPath = path.join(ROOT, dts);

  console.log(`Generating ${js} from ${proto}`);
  await runPbjs(protoPath, jsPath);
  fixCjsImport(jsPath);
  prependLicenseHeader(jsPath);

  console.log(`Generating ${dts} from ${js}`);
  await runPbts(jsPath, dtsPath);
}

console.log('Proto generation complete.');
