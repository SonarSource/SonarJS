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
import { createVueSourceFile, getVueScript, isVueFile } from '../parsers/vue.js';
import { jsxEnabledFor } from '../parsers/options.js';

type LanguageVersion = ts.ScriptTarget | ts.CreateSourceFileOptions;

/** The compiler's view of a file; filesystem reads continue to serve its original text. */
export interface FileRepresentation {
  readonly text: string;
  readonly scriptKind?: ts.ScriptKind;
  readonly reusable: boolean;
  createSourceFile(file: string, languageVersion: LanguageVersion): ts.SourceFile;
}

interface FileRepresentationStrategy {
  prepare(file: string, raw: string, options: ts.CompilerOptions): FileRepresentation;
}

const plain: FileRepresentationStrategy = {
  prepare(_file, raw) {
    return {
      text: raw,
      reusable: true,
      createSourceFile(file, languageVersion) {
        const target =
          typeof languageVersion === 'number' ? languageVersion : languageVersion.languageVersion;
        return ts.createSourceFile(file, raw, target, true);
      },
    };
  },
};

const vue: FileRepresentationStrategy = {
  prepare(file, raw, options) {
    const script = getVueScript(file, raw, jsxEnabledFor(options));
    return {
      text: script?.code ?? '',
      scriptKind: script?.scriptKind ?? ts.ScriptKind.TS,
      reusable: script !== undefined,
      createSourceFile: (name, languageVersion) =>
        createVueSourceFile(name, script, languageVersion),
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
