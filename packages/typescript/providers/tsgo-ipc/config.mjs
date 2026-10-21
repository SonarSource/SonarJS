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
import path from 'node:path';
import { sys, normalize, nativePaths, restorePaths } from './filesystem.mjs';

export function createConfiguration(runtime) {
  const diagnostic = value =>
    value && {
      ...value,
      messageText: value.text,
      start: value.pos,
      length: value.end - value.pos,
    };
  function parseConfigFileTextToJson(file, text) {
    const name = normalize(file);
    return runtime.invoke({ ...sys, readFile: f => (f === name ? text : undefined) }, api => {
      const result = api.readConfigFile(name);
      return { ...result, error: diagnostic(result.error) };
    });
  }
  function readConfigFile(file, readFile) {
    const name = normalize(file);
    return runtime.invoke(
      { ...sys, readFile: f => (f === name ? readFile(file) : undefined) },
      api => {
        const result = api.readConfigFile(name);
        return { ...result, error: diagnostic(result.error) };
      },
    );
  }
  function parseJsonConfigFileContent(
    json,
    host,
    basePath,
    existingOptions = {},
    configFileName,
    _resolutionStack,
    extraExtensions = [],
    extendedCache,
  ) {
    // The native endpoint performs option conversion, extends lookup and file
    // expansion. Its callbacks retain the analyzer's request filesystem policy.
    const read = host.readFile.bind(host),
      observed = new Map();
    const callbacks = {
      ...host,
      readFile: file => {
        const text = read(file);
        if (text !== undefined && /\.json$/i.test(file)) observed.set(file, text);
        return text;
      },
    };
    const reversed = new Map();
    const encoded = nativePaths(json, reversed);
    const result = runtime.invoke(callbacks, api =>
      api.parseJsonConfigFileContent(encoded, {
        configFileName: configFileName || normalize(path.join(basePath, 'tsconfig.json')),
      }),
    );
    for (const [file, text] of observed) {
      const raw = parseConfigFileTextToJson(file, text).config;
      extendedCache?.set(file, { extendedConfig: { raw } });
    }
    result.options = restorePaths(result.options, reversed);
    // Extra analyzer extensions are explicit roots; the public API's config
    // parser otherwise only includes TS/JS extensions.
    for (const { extension } of json.files && !json.include ? [] : extraExtensions) {
      for (const file of host.readDirectory(
        basePath,
        [extension.startsWith('.') ? extension : '.' + extension],
        json.exclude,
        json.include ?? ['**/*'],
      ))
        if (!result.fileNames.includes(file)) result.fileNames.push(file);
    }
    // Native diagnostics and references use absolute paths; preserve the caller's
    // config path convention at this compatibility boundary.
    if (!path.isAbsolute(basePath)) {
      for (const reference of result.projectReferences ?? [])
        reference.path = path.relative(process.cwd(), reference.path) || '.';
    }
    const errors = result.errors
      .filter(error => error.code !== 18003 || !result.fileNames.length)
      .map(value =>
        diagnostic({
          ...value,
          text: configFileName
            ? value.text.replaceAll(normalize(configFileName), configFileName)
            : value.text,
        }),
      );
    return { ...result, options: { ...result.options, ...existingOptions }, errors, raw: json };
  }
  function convertCompilerOptionsFromJson(json, basePath, configFileName) {
    const result = parseJsonConfigFileContent(
      { compilerOptions: json, files: [] },
      sys,
      basePath,
      {},
      configFileName,
    );
    return { options: result.options, errors: result.errors.filter(error => error.code !== 18002) };
  }
  return {
    parseConfigFileTextToJson,
    readConfigFile,
    parseJsonConfigFileContent,
    convertCompilerOptionsFromJson,
  };
}
