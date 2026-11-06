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
import {
  prepareVueGenerics,
  applyVueGenericServices,
  type VueGenericProjection,
} from './vue-generics.js';

type ScriptParserOptions = NonNullable<Parameters<typeof parsersMap.typescript.parseForESLint>[1]>;
type ScriptParser = {
  parseForESLint(
    code: string,
    options: ScriptParserOptions,
  ): ReturnType<typeof parsersMap.typescript.parseForESLint>;
};

type VueScript = {
  /** Text supplied by Vue to the inner ESLint parser. */
  readonly code: string;
  /** Text used by the compiler; differs for genuine generic setup functions. */
  readonly compilerCode: string;
  readonly jsx: boolean;
  readonly scriptKind: ts.ScriptKind;
  readonly generics?: VueGenericProjection | null;
};

const projectionKey = Symbol('SonarJS Vue script');
const projections = new FileSystemMap<
  string,
  { raw: string; scripts: Map<boolean, VueScript | undefined> }
>();
// Parser services require metadata on the exact SourceFile held by the Program.
// The representation factory binds it for both newly parsed and cached instances.
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
                source: parsed.services.esTreeNodeToTSNodeMap.get(parsed.ast),
                jsx: attemptJsx,
                scriptKind: scriptKindFor(typescript, attemptJsx),
              },
            },
          };
        }),
      });
      const captured = (
        result.services as
          | {
              [projectionKey]?: Omit<VueScript, 'compilerCode'> & { source: ts.SourceFile };
            }
          | undefined
      )?.[projectionKey];
      if (captured) {
        const { source, ...prepared } = captured;
        const generics = prepareVueGenerics(result, source);
        script = { ...prepared, generics, compilerCode: generics?.code ?? prepared.code };
      }
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
  cached?: ts.SourceFile,
): ts.SourceFile {
  const sourceFile =
    cached ??
    ts.createSourceFile(
      file,
      script?.compilerCode ?? '',
      {
        ...(typeof languageVersion === 'number' ? { languageVersion } : languageVersion),
        // Every SFC has module scope, even without imports or exports.
        setExternalModuleIndicator: source => {
          Object.assign(source, { externalModuleIndicator: true });
        },
      },
      true,
      script?.scriptKind ?? ts.ScriptKind.TS,
    );
  if (script) {
    sourceFileScripts.set(sourceFile, script);
  } else {
    sourceFileScripts.delete(sourceFile);
  }
  return sourceFile;
}

/**
 * Supplied Programs are selected by filename by typescript-eslint, without verifying
 * text or mode. Never expose a complete script Program to Vue's auxiliary parses,
 * nor a stale/incompatible SourceFile to its final script parse.
 */
export function createVueScriptParser(raw: string, program?: ts.Program): ScriptParser {
  return {
    parseForESLint(code, options) {
      const sourceFile = options.filePath ? program?.getSourceFile(options.filePath) : undefined;
      const script = sourceFile ? sourceFileScripts.get(sourceFile) : undefined;
      const candidate =
        script?.code === code &&
        sourceFile?.text === script.compilerCode &&
        script.jsx === !!options.ecmaFeatures?.jsx;
      const current = candidate && getVueScript(options.filePath!, raw, script.jsx);
      const matches =
        current &&
        script?.compilerCode === current.compilerCode &&
        script.scriptKind === current?.scriptKind &&
        current.generics !== null;
      const parsed = parsersMap.typescript.parseForESLint(code, {
        ...syntaxOnly(options),
        programs: matches && !script?.generics && program ? [program] : undefined,
      });
      return matches && current?.generics && program && sourceFile
        ? applyVueGenericServices(parsed, current.generics, program, sourceFile)
        : parsed;
    },
  };
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
