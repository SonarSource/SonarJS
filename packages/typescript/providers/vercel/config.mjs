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
import path from 'node:path/posix';
import {
  ConfigParser,
  ConfigFileConverter,
  TsConfigSourceFile,
  JsonObject,
  JsonArray,
  parseConfigText,
} from 'tsc-ts-source/packages/tsc-ts/src/compiler/tsconfig.ts';
import {
  compilerOptionsOf,
  compilerOptionsFromApi,
} from 'tsc-ts-source/packages/tsc-ts/src/library/options.ts';
import { diagnosticOf } from 'tsc-ts-source/packages/tsc-ts/src/library/diagnostics.ts';
import { createHostFileSystem, sys } from './filesystem.mjs';

function plain(value) {
  if (value instanceof JsonObject)
    return Object.fromEntries([...value.entries].map(([key, item]) => [key, plain(item)]));
  if (value instanceof JsonArray) return value.items.map(plain);
  return value;
}
function diagnostic(d) {
  return normalizeDiagnostic(diagnosticOf(d));
}
function normalizeDiagnostic(converted) {
  return {
    ...converted,
    file: undefined,
    relatedInformation: converted.relatedInformation?.map(normalizeDiagnostic),
    messageText: converted.text,
    start: converted.pos,
    length: converted.end - converted.pos,
  };
}
function effective(options) {
  return Object.fromEntries(
    Object.entries(compilerOptionsOf(options)).filter(([, value]) => value !== undefined),
  );
}
export function parseConfigFileTextToJson(file, text) {
  const source = parseConfigText(file, file, text);
  const errors = [...source.diagnostics];
  const converter = new ConfigFileConverter(
    new ConfigParser(createHostFileSystem(sys), path.dirname(file)),
    source,
    path.dirname(file),
    file,
    errors,
  );
  // Reading JSON must not resolve extends or validate compiler options yet.
  converter.onPropertySet = () => {};
  const raw = converter.convertRoot();
  return { config: plain(raw), error: errors[0] && diagnostic(errors[0]) };
}
export function readConfigFile(file, readFile) {
  const text = readFile(file);
  if (text === undefined)
    return {
      config: {},
      error: {
        code: 5083,
        messageText: `Cannot read file '${file}'.`,
        category: 1,
        file: undefined,
        start: undefined,
        length: undefined,
      },
    };
  return parseConfigFileTextToJson(file, text);
}
export function convertCompilerOptionsFromJson(json, basePath, configFileName = '') {
  const file = configFileName || path.join(basePath, 'tsconfig.json');
  const source = parseConfigText(file, file, JSON.stringify({ compilerOptions: json }));
  const errors = [];
  const converter = new ConfigFileConverter(
    new ConfigParser(createHostFileSystem(sys), basePath),
    source,
    basePath,
    configFileName,
    errors,
  );
  converter.convertRoot();
  return { options: effective(converter.options), errors: errors.map(diagnostic) };
}
/** @type {import('../../contract.cjs').CompilerBindings['parseJsonConfigFileContent']} */
export function parseJsonConfigFileContent(
  json,
  host,
  basePath,
  existingOptions = {},
  configFileName,
  _stack,
  extraExtensions = [],
  extendedCache,
) {
  const file = configFileName || path.join(basePath, 'tsconfig.json');
  const parser = new ConfigParser(createHostFileSystem(host), basePath);
  parser.readDirectory = host.readDirectory.bind(host);
  parser.extraFileExtensions = extraExtensions.map(item => '.' + item.extension.replace(/^\./, ''));
  const source = parseConfigText(file, file, JSON.stringify(json));
  const parsed = parser.parseConfigFileContent(
    new TsConfigSourceFile(source),
    basePath,
    compilerOptionsFromApi(existingOptions),
    undefined,
    configFileName ?? '',
  );
  for (const [name, extended] of parser.extendedConfigs) {
    extendedCache?.set(name, { extendedConfig: { raw: plain(extended.config?.raw) } });
  }
  const options = effective(parsed.options);
  // Keep config provenance and root JSON available to the analyzer's policy layer.
  return {
    options,
    fileNames: [...parsed.fileNames],
    errors: parsed.errors.map(diagnostic),
    raw: json,
    projectReferences: parsed.projectReferences.length ? parsed.projectReferences : undefined,
  };
}
