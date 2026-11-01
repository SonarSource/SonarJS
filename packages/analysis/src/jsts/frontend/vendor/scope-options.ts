// Adapted from typescript-eslint 8.71.2 parser.ts; see vendor/LICENSE.
import ts, { ScriptTarget } from 'typescript';
import type { Lib } from './types/index.js';
import { typescriptVersionIsAtLeast } from './typescript-estree/version-check.js';
const LIB_FILENAME_REGEX = /lib\.(.+)\.d\.[cm]?ts$/;
export function getLib(compilerOptions: ts.CompilerOptions): Lib[] {
  if (compilerOptions.lib) {
    return compilerOptions.lib
      .map(lib => LIB_FILENAME_REGEX.exec(lib.toLowerCase())?.[1])
      .filter((lib): lib is Lib => !!lib);
  }

  const defaultTarget = typescriptVersionIsAtLeast['6.0']
    ? ScriptTarget.LatestStandard
    : ScriptTarget.ES5; // eslint-disable-line @typescript-eslint/no-deprecated -- Deprecated in TS 6 but we support TS < 6

  const target = compilerOptions.target ?? defaultTarget;
  // https://github.com/microsoft/TypeScript/blob/35ff23d4b0cc715691323ebe54f523c16fe6e3a5/src/compiler/utilitiesPublic.ts#L312-L346
  switch (target) {
    case ScriptTarget.ES2015:
      return ['es6'];
    case ScriptTarget.ES2016:
      return ['es2016.full'];
    case ScriptTarget.ES2017:
      return ['es2017.full'];
    case ScriptTarget.ES2018:
      return ['es2018.full'];
    case ScriptTarget.ES2019:
      return ['es2019.full'];
    case ScriptTarget.ES2020:
      return ['es2020.full'];
    case ScriptTarget.ES2021:
      return ['es2021.full'];
    case ScriptTarget.ES2022:
      return ['es2022.full'];
    case ScriptTarget.ES2023:
      return ['es2023.full'];
    case ScriptTarget.ES2024:
      return ['es2024.full'];
    case ScriptTarget.ES2025:
      return ['es2025.full'];
    case ScriptTarget.ESNext:
      return ['esnext.full'];
    default:
      return ['lib'];
  }
}
