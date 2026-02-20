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
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

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

function copyToLib(filePath: string) {
  const libPath = path.join(ROOT, 'lib', filePath.replace('packages/', ''));
  fs.mkdirSync(path.dirname(libPath), { recursive: true });
  fs.copyFileSync(path.join(ROOT, filePath), libPath);
}

if (process.argv.includes('--copy')) {
  for (const { js, dts } of PROTO_FILES) {
    copyToLib(js);
    if (!js.startsWith('packages/jsts')) {
      copyToLib(dts);
    }
  }
  console.log('Proto files copied to lib/.');
} else {
  const pbjs = (await import('protobufjs-cli/pbjs.js')).default;
  const pbts = (await import('protobufjs-cli/pbts.js')).default;

  const LICENSE_HEADER = fs.readFileSync(path.join(ROOT, 'tools/header.ts'), 'utf-8');

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
   * Post-process the generated JS to fix two protobufjs issues:
   *
   * 1. CJS interop: The built-in es6 wrapper generates `import * as $protobuf from "protobufjs/minimal"`
   *    which breaks at runtime because protobufjs/minimal is a CJS module — `import * as` creates a
   *    namespace object where `.roots` is undefined. We fix this to use a default import which
   *    correctly gets the CJS module.exports object.
   *
   * 2. Shared roots: All generated files share `$protobuf.roots["default"]`, a global singleton that
   *    causes namespace collisions when multiple proto files are loaded in the same process
   *    (see https://github.com/protobufjs/protobuf.js/issues/1477). We replace it with a local object.
   */
  function fixGeneratedJs(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fixed = content
      .replace(
        'import * as $protobuf from "protobufjs/minimal"',
        'import $protobuf from "protobufjs/minimal.js"',
      )
      .replace(
        'const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});',
        'const $root = {};',
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
    fixGeneratedJs(jsPath);
    prependLicenseHeader(jsPath);

    console.log(`Generating ${dts} from ${js}`);
    await runPbts(jsPath, dtsPath);
  }
  console.log('Proto generation complete.');
}
