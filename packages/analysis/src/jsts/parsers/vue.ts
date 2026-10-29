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
import { parsersMap } from './eslint.js';
import { buildVueParserOptions } from './options.js';

type ScriptParserOptions = NonNullable<Parameters<typeof parsersMap.typescript.parseForESLint>[1]>;

type VueScript = {
  code: string;
  jsx: boolean;
  scriptKind: ts.ScriptKind;
};

const projectionKey = Symbol('SonarJS Vue script');
const projections = new Map<
  string,
  { raw: string; scripts: Map<boolean, VueScript | undefined> }
>();
const sourceFileScripts = new WeakMap<ts.SourceFile, VueScript>();

export function isVueFile(file: string): boolean {
  return file.toLowerCase().endsWith('.vue');
}

export function clearVueScriptCache(): void {
  projections.clear();
}

/**
 * Let Vue perform its own extraction/setup/generic rewriting. Only the final script's
 * services survive on the outer result; helpers can run both before AND after it.
 * Keep raw SFC contents authoritative elsewhere (CSS, locations, filesystem replay).
 */
export function getVueScript(file: string, raw: string, jsx: boolean): VueScript | undefined {
  let entry = projections.get(file);
  if (entry?.raw !== raw) {
    entry = { raw, scripts: new Map() };
    projections.set(file, entry);
  }
  if (entry.scripts.has(jsx)) {
    return entry.scripts.get(jsx);
  }

  let script: VueScript | undefined;
  for (const attemptJsx of [jsx, !jsx]) {
    try {
      const result = parsersMap.vuejs.parseForESLint(raw, {
        ...buildVueParserOptions('ts', { filePath: file }, { jsx: attemptJsx }),
        parser: {
          parseForESLint(code: string, options: ScriptParserOptions) {
            const parsed = parsersMap.typescript.parseForESLint(code, syntaxOnly(options));
            return {
              ...parsed,
              services: {
                ...parsed.services,
                [projectionKey]: {
                  code,
                  jsx: attemptJsx,
                  // Like typescript-eslint, treat the unknown .vue extension as TS/TSX.
                  scriptKind: attemptJsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
                },
              },
            };
          },
        },
      });
      script = (result.services as { [projectionKey]?: VueScript } | undefined)?.[projectionKey];
      break;
    } catch {
      // Preserve the normal Vue/Babel error and fallback paths during actual analysis.
      // An invalid SFC must not prevent construction of the rest of the project's Program.
    }
  }
  entry.scripts.set(jsx, script);
  return script;
}

export function createVueSourceFile(
  file: string,
  script: VueScript | undefined,
  languageVersion: ts.ScriptTarget | ts.CreateSourceFileOptions,
): ts.SourceFile {
  const sourceFile = ts.createSourceFile(
    file,
    script?.code ?? '',
    languageVersion,
    true,
    script?.scriptKind ?? ts.ScriptKind.TS,
  );
  if (script) {
    sourceFileScripts.set(sourceFile, script);
  }
  return sourceFile;
}

/**
 * Supplied Programs are selected by filename by typescript-eslint, without verifying
 * text or mode. Never expose a complete script Program to Vue's auxiliary parses,
 * nor a stale/incompatible SourceFile to its final script parse.
 */
export function createVueScriptParser(program?: ts.Program): {
  parseForESLint(
    code: string,
    options: ScriptParserOptions,
  ): ReturnType<typeof parsersMap.typescript.parseForESLint>;
} {
  return {
    parseForESLint(code: string, options: ScriptParserOptions) {
      const sourceFile = options.filePath ? program?.getSourceFile(options.filePath) : undefined;
      const script = sourceFile && sourceFileScripts.get(sourceFile);
      const matches =
        script &&
        script.code === code &&
        sourceFile.text === code &&
        script.jsx === !!options.ecmaFeatures?.jsx;
      return parsersMap.typescript.parseForESLint(code, {
        ...syntaxOnly(options),
        programs: matches ? [program!] : undefined,
      });
    },
  };
}

function syntaxOnly(options: ScriptParserOptions): ScriptParserOptions {
  return { ...options, programs: undefined, project: false, projectService: false };
}
