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
import * as sdk from 'typescript-go/sync';
import * as native from 'typescript-go/ast';
import { serverFS } from 'typescript-go/fs';
import metadata from 'typescript-go/package.json' with { type: 'json' };
import configuration from '../../providers.json' with { type: 'json' };
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRuntime } from '../tsgo/runtime.mjs';
import { createProvider } from '../tsgo/provider.mjs';

const descriptor = configuration.providers['tsgo-ipc'];
const packaged = typeof __SONARJS_COMPILER_BUNDLE__ !== 'undefined';
const libraryDirectory = packaged
  ? path.resolve(__dirname, descriptor.libraryDestination ?? '')
  : fileURLToPath(new URL('../../' + descriptor.libraries + '/', import.meta.url));
const executable = path.join(
  libraryDirectory,
  `tsc-${process.platform}-${process.arch}${process.platform === 'win32' ? '.exe' : ''}`,
);
const runtime = createRuntime(sdk.API, serverFS, executable, metadata.version);
const provider = createProvider({
  sdk,
  native,
  runtime,
  libraryDirectory,
  version: metadata.version,
});
export const { close, timing } = provider;
export const { createProgram, createSourceFile } = provider.compiler;
export default provider;
