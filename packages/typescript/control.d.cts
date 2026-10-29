import type ts = require('typescript-classic');

export type TypeScriptFailureCode =
  | 'unsupported-operation'
  | 'invalid-reference'
  | 'disposed'
  | 'cancelled'
  | 'filesystem'
  | 'backend';
export class TypeScriptFailure extends Error {
  readonly code: TypeScriptFailureCode;
  readonly operation?: string;
  constructor(code: TypeScriptFailureCode, message: string, operation?: string);
}
export interface CompilerProvider {
  readonly name: string;
  readonly exports: Readonly<Record<string, unknown>>;
  readonly packageMetadata: { readonly name: string; readonly version: string };
  readonly implementationRoots: readonly string[];
  readonly assertHealthy?: () => void;
}
export interface CompilerGateway {
  readonly provider: string;
  readonly facade: typeof ts;
  assertHealthy(): void;
  observations(): readonly { readonly importer: string; readonly specifier: string }[];
}
export function installCompilerGateway(provider: CompilerProvider): CompilerGateway;
export function getCompilerGateway(): CompilerGateway;
export function initializeCompiler(): Promise<void>;
/** Optional metrics only; program creation still uses the public compiler API. */
export function configureCompilerInstrumentation(options: {
  collectTiming?: boolean;
  filesystem?: 'callbacks' | 'layer';
}): void;
export function getProgramInstrumentation(program: ts.Program):
  | {
      timings: Record<string, number>;
      filesystem: Readonly<Record<string, unknown>>;
      ipc: { totals: Record<string, number>; recentRequests: readonly unknown[] };
      failures: readonly { method: string; message: string }[];
    }
  | undefined;
export function compilerOptionsToJson(options: ts.CompilerOptions): Record<string, unknown>;
export function getCompilerInfo(): {
  backend: string;
  version: string;
  compatibilityVersion: string;
  sdkRoot?: string;
  classicRoot?: string;
  revision?: string;
};
export function prepareProgramRequest(events?: readonly string[]): void;
export function finishProgramRequest(keepForIDE: boolean): void;
export function clearProgramCache(): void;
export function getCompilerCachePolicy(): { readonly retainAnalysisStateForIDE: boolean };
export function getProgramFileNames(program: ts.Program): string[];
export function getProjectCache():
  | {
      getProgram(
        baseDir: string,
        sourceFile: string,
        options: () => ts.CreateProgramOptions | undefined,
        restrict: boolean,
      ): ts.Program | undefined;
    }
  | undefined;
