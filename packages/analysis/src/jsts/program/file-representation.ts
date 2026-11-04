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
import {
  clearVueScriptCache,
  createVueSourceFile,
  getVueScript,
  isVueFile,
} from '../parsers/vue.js';
import { jsxEnabledFor } from '../parsers/options.js';

type LanguageVersion = ts.ScriptTarget | ts.CreateSourceFileOptions;

/** The compiler's view of a file; filesystem reads continue to serve its original text. */
export interface FileRepresentation {
  readonly text: string;
  readonly scriptKind?: ts.ScriptKind;
  readonly reusable: boolean;
  /**
   * Bind representation metadata to a new or cached SourceFile. A supplied cache
   * entry must already match the text, script kind and parsing options. Preserve
   * its identity: the Program and parser services must share the same instance.
   */
  createSourceFile(
    file: string,
    languageVersion: LanguageVersion,
    cached?: ts.SourceFile,
  ): ts.SourceFile;
}

interface FileRepresentationStrategy {
  prepare(file: string, raw: string, options: ts.CompilerOptions): FileRepresentation;
}

const plain: FileRepresentationStrategy = {
  prepare(_file, raw) {
    return {
      text: raw,
      reusable: true,
      createSourceFile(file, languageVersion, cached) {
        const target =
          typeof languageVersion === 'number' ? languageVersion : languageVersion.languageVersion;
        return cached ?? ts.createSourceFile(file, raw, target, true);
      },
    };
  },
};

const vue: FileRepresentationStrategy = {
  prepare(file, raw, options) {
    const script = getVueScript(file, raw, jsxEnabledFor(options));
    return {
      text: script?.compilerCode ?? '',
      scriptKind: script?.scriptKind ?? ts.ScriptKind.TS,
      reusable: script !== undefined,
      createSourceFile: (name, languageVersion, cached) =>
        createVueSourceFile(name, script, languageVersion, cached),
    };
  },
};

export function prepareFileRepresentation(
  file: string,
  raw: string,
  options: ts.CompilerOptions,
): FileRepresentation {
  return (isVueFile(file) ? vue : plain).prepare(file, raw, options);
}

/** Keep representation-specific cache ownership out of the shared source cache. */
export function clearFileRepresentationCaches(): void {
  clearVueScriptCache();
}

export function equivalentRepresentations(
  previous: FileRepresentation | undefined,
  current: FileRepresentation,
): boolean {
  return (
    current.reusable &&
    previous?.reusable === true &&
    previous.text === current.text &&
    previous.scriptKind === current.scriptKind
  );
}
