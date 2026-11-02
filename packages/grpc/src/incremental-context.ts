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
import ts from 'typescript';
import { createHash } from 'node:crypto';
import { refreshFilesystemBaseline } from '../../shared/src/fs-cache/hook.js';
import {
  nativeFs,
  writeFileWithNativePrimitives,
  ARCHIVE_FILE_MODE,
} from '../../shared/src/fs-cache/archive-types.js';
import type { ProgramSelectionArchive } from '../../analysis/src/program-selection/archive.js';
import type { AnalyzeProjectProtoRequest } from './analyze-project-request.js';
import {
  normalizeToAbsolutePath,
  type NormalizedAbsolutePath,
} from '../../shared/src/helpers/files.js';
import { debug } from '../../shared/src/helpers/logging.js';
import { sonarjs } from './proto/analyze-project.js';

const RECORD = sonarjs.analyzeproject.v1.FilesystemCacheMode.FILESYSTEM_CACHE_MODE_RECORD;

// Source lists and settings are part of the bundle, not individual per-file cache generations.
export function snapshotManifest(request: AnalyzeProjectProtoRequest): string {
  const baseDir = request.configuration!.baseDir!;
  const configuration = { ...request.configuration, analysisMode: undefined, fsEvents: undefined };
  const files = Object.entries(request.files ?? {})
    .map(([file, input]) => [path.relative(baseDir, file).replaceAll('\\', '/'), input.fileType])
    .sort(([a], [b]) => String(a).localeCompare(String(b)));
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value)
          .filter(([, value]) => value !== undefined)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => [key, canonical(value)]),
      );
    if (typeof value === 'string') {
      const normalized = value.replaceAll('\\', '/');
      const root = baseDir.replaceAll('\\', '/').replace(/\/$/, '');
      for (const prefix of ['', 'directory:', 'file:']) {
        if (normalized === prefix + root || normalized.startsWith(prefix + root + '/')) {
          return prefix + '$PROJECT' + normalized.slice(prefix.length + root.length);
        }
      }
    }
    return value;
  };
  return JSON.stringify({
    version: 1,
    fingerprint: createHash('sha256')
      .update(
        JSON.stringify(
          canonical({
            configuration,
            files,
            rules: request.rules,
            cssRules: request.cssRules,
            bundles: request.bundles,
            rulesWorkdir: request.rulesWorkdir,
          }),
        ),
      )
      .digest('hex'),
  });
}

export function reuseContextBaseline(
  request: AnalyzeProjectProtoRequest,
  programSelection: ProgramSelectionArchive | undefined,
  manifest: string,
): ReadonlySet<NormalizedAbsolutePath> | undefined {
  const cache = request.filesystemCache;
  if (
    cache?.mode !== RECORD ||
    !cache.baselineArchivePath ||
    !cache.baselineAnalysisMetadataPath ||
    !cache.baselineManifestPath ||
    !cache.baselineContextMetadata ||
    !programSelection
  )
    return;
  try {
    if (
      request.configuration?.canAccessFileSystem === false ||
      Object.values(request.files ?? {}).some(file => file.fileContent != null)
    ) {
      throw new Error('baseline refresh requires native source inputs');
    }
    if (nativeFs.readFileSync(cache.baselineManifestPath, 'utf8') !== manifest)
      throw new Error('settings or input files changed');
    const files = new Map(
      Object.entries(request.files ?? {}).map(([file, input]) => [path.resolve(file), input]),
    );
    const refreshed = refreshFilesystemBaseline(
      cache.baselineArchivePath,
      (file, before, after) => {
        // Dependencies/configuration must match byte-for-byte. Initially only ordinary source edits
        // preserving dependency directives and module/script classification reuse program selections.
        if (!files.has(path.resolve(file)) || !/\.[cm]?[jt]sx?$/i.test(file)) return false;
        return (
          sourceDependencies(file, before.toString('utf8')) ===
          sourceDependencies(file, after.toString('utf8'))
        );
      },
    );
    if (!refreshed) throw new Error('filesystem dependencies or source imports changed');
    // Load into a separate recorder first, so invalid metadata cannot partially seed this run.
    programSelection.seedFrom(
      cache.baselineAnalysisMetadataPath,
      cache.baselineContextMetadata,
      [...files]
        .filter(
          ([file, input]) => input.reuseCachedAnalysis && /(?:\.[cm]?[jt]sx?|\.vue)$/i.test(file),
        )
        .map(([file]) => normalizeToAbsolutePath(file)),
    );
    const cachedFiles = new Set<NormalizedAbsolutePath>();
    for (const [file, input] of files) {
      if (input.reuseCachedAnalysis) cachedFiles.add(normalizeToAbsolutePath(file));
    }
    debug('Reusing the sensor-cache context baseline for ' + cachedFiles.size + ' file(s)');
    return cachedFiles;
  } catch (error) {
    debug(
      'Cannot reuse the sensor-cache context baseline; recording a full context: ' + String(error),
    );
    return;
  }
}

export function sourceDependencies(file: string, content: string): string {
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, false);
  const imports: string[] = [];
  const ambientExternalModules: string[] = [];
  // Use the compiler facade's supported AST operations rather than preProcessFile.
  const visit = (node: ts.Node): void => {
    const specifier = dependencySpecifier(node);
    if (specifier && ts.isStringLiteralLike(specifier)) imports.push(specifier.text);
    if (ts.isModuleDeclaration(node) && ts.isStringLiteral(node.name)) {
      ambientExternalModules.push(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return JSON.stringify({
    module: ts.isExternalModule(source),
    isLibFile: source.hasNoDefaultLib,
    ambientExternalModules,
    imports,
    references: [
      source.referencedFiles,
      source.typeReferenceDirectives,
      source.libReferenceDirectives,
    ].map(refs => refs.map(ref => ref.fileName)),
  });
}

function dependencySpecifier(node: ts.Node): ts.Node | undefined {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return node.moduleSpecifier;
  if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference))
    return node.moduleReference.expression;
  if (
    ts.isCallExpression(node) &&
    (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
  )
    return node.arguments[0];
  if (node.kind === ts.SyntaxKind.ImportType) {
    const argument = (node as ts.ImportTypeNode).argument;
    if (ts.isLiteralTypeNode(argument)) return argument.literal;
  }
  return;
}

export function writeSnapshotManifest(request: AnalyzeProjectProtoRequest, manifest: string): void {
  const file = request.filesystemCache?.snapshotManifestPath;
  if (!file || request.filesystemCache?.mode !== RECORD) return;
  nativeFs.mkdirSync(path.dirname(file), { recursive: true });
  writeFileWithNativePrimitives(file, Buffer.from(manifest), ARCHIVE_FILE_MODE);
}
