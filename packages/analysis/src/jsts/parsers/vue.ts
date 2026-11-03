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
import { FileSystemMap } from '../../common/filesystem.js';

type ScriptParserOptions = NonNullable<Parameters<typeof parsersMap.typescript.parseForESLint>[1]>;
type ScriptParser = {
  parseForESLint(
    code: string,
    options: ScriptParserOptions,
  ): ReturnType<typeof parsersMap.typescript.parseForESLint>;
};

type VueScript = {
  code: string;
  jsx: boolean;
  scriptKind: ts.ScriptKind;
};

const projectionKey = Symbol('SonarJS Vue script');
const projections = new FileSystemMap<
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
        parser: vueScriptParsers((code, options, typescript) => {
          const parsed = parsersMap.typescript.parseForESLint(code, syntaxOnly(options));
          return {
            ...parsed,
            services: {
              ...parsed.services,
              [projectionKey]: {
                code,
                jsx: attemptJsx,
                scriptKind: scriptKindFor(typescript, attemptJsx),
              },
            },
          };
        }),
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
    {
      ...(typeof languageVersion === 'number' ? { languageVersion } : languageVersion),
      // Every SFC has module scope, even without imports or exports. Preserve the
      // exact script text so TypeScript/ESTree node mappings remain valid.
      setExternalModuleIndicator: source => {
        Object.assign(source, { externalModuleIndicator: true });
      },
    },
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
export function createVueScriptParser(program?: ts.Program): Record<string, ScriptParser> {
  return vueScriptParsers((code, options, typescript) => {
    const sourceFile = options.filePath ? program?.getSourceFile(options.filePath) : undefined;
    const script = sourceFile ? sourceFileScripts.get(sourceFile) : undefined;
    const matches =
      script?.code === code &&
      sourceFile?.text === code &&
      script.jsx === !!options.ecmaFeatures?.jsx &&
      script.scriptKind === scriptKindFor(typescript, script.jsx);
    return parsersMap.typescript.parseForESLint(code, {
      ...syntaxOnly(options),
      programs: matches && program ? [program] : undefined,
    });
  });
}

/** Let Vue select the script language, including its choice for combined scripts. */
function vueScriptParsers(
  parseForESLint: (
    code: string,
    options: ScriptParserOptions,
    typescript: boolean,
  ) => ReturnType<typeof parsersMap.typescript.parseForESLint>,
) {
  const javascript = {
    parseForESLint: (code: string, options: ScriptParserOptions) =>
      parseForESLint(code, options, false),
  };
  const typescript = {
    parseForESLint: (code: string, options: ScriptParserOptions) =>
      parseForESLint(code, options, true),
  };
  return { js: javascript, jsx: javascript, ts: typescript, tsx: typescript };
}

function scriptKindFor(typescript: boolean, jsx: boolean): ts.ScriptKind {
  if (typescript) {
    return jsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  }
  return jsx ? ts.ScriptKind.JSX : ts.ScriptKind.JS;
}

function syntaxOnly(options: ScriptParserOptions): ScriptParserOptions {
  return { ...options, programs: undefined, project: false, projectService: false };
}
