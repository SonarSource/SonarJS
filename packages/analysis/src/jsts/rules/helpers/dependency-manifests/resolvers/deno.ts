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
import ts from 'typescript';
import { type ManifestResolver, type DependencyManifest, type DenoManifest } from './types.js';
import { type File, stripBOM } from '../../files.js';
import { DENO_JSON, DENO_JSONC } from '../index.js';
import { getManifestFileInDir } from './helpers.js';

export const denoManifestResolver: ManifestResolver = {
  resolve(dir, topDir, fileSystem): DependencyManifest[] {
    // if both `deno.json` and `deno.jsonc` are present, prefer `deno.json` and ignore `deno.jsonc`
    const denoJson = getManifestFileInDir(DENO_JSON, dir, topDir, fileSystem);
    const denoJsonc = getManifestFileInDir(DENO_JSONC, dir, topDir, fileSystem);
    if (denoJsonc && denoJson === undefined) {
      return [{ type: 'deno', manifest: parseDenoManifest(denoJsonc) ?? {} }];
    } else if (denoJson) {
      return [{ type: 'deno', manifest: parseDenoManifest(denoJson) ?? {} }];
    }
    return [];
  },
};

function parseDenoManifest(file: File): DenoManifest | undefined {
  try {
    // ts.parseConfigFileTextToJson handles JSON with comments and trailing commas
    const parsed = ts.parseConfigFileTextToJson(file.path, stripBOM(file.content.toString()));
    if (parsed.error) {
      const message = ts.flattenDiagnosticMessageText(parsed.error.messageText, '\n');
      console.debug(`Error parsing deno manifest ${file.path}: ${message}`);
      return;
    }
    return parsed.config as DenoManifest;
  } catch (error) {
    console.debug(`Error parsing deno manifest ${file.path}: ${error}`);
    return;
  }
}
