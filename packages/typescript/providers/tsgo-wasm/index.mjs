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
import * as sdk from 'typescript-go-wasm/sync';
import * as native from 'typescript-go-wasm/ast';
import { serverFS } from 'typescript-go-wasm/fs';
import metadata from 'typescript-go-wasm/package.json' with { type: 'json' };
import configuration from '../../providers.json' with { type: 'json' };
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProvider } from '../tsgo/provider.mjs';
import { createRuntime } from '../tsgo/runtime.mjs';

const descriptor = configuration.providers['tsgo-wasm'];
const packaged = typeof __SONARJS_COMPILER_BUNDLE__ !== 'undefined';
const libraryDirectory = packaged
  ? path.resolve(__dirname, descriptor.libraryDestination)
  : // The preparation step emits this module beside assets/.
    fileURLToPath(new URL('./assets/', import.meta.url));
class WasmAPI extends sdk.API {
  constructor(options) {
    super({
      ...options,
      fs: Object.fromEntries(
        Object.entries(options.fs).map(([name, callback]) => [
          name,
          typeof callback === 'function'
            ? (file, ...args) =>
                file === 'bundled:///libs' || file.startsWith('bundled:///libs/')
                  ? serverFS.useOS
                  : callback(file, ...args)
            : callback,
        ]),
      ),
    });
  }
}
const runtime = createRuntime(
  WasmAPI,
  serverFS,
  path.join(libraryDirectory, 'tsgo.wasm'),
  metadata.version,
);
export default createProvider({
  sdk,
  native,
  runtime,
  libraryDirectory,
  version: metadata.version,
});
