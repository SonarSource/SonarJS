import type ts from 'typescript';

/** Returns TypeScript's effective strict-null setting for a compiler program. */
export function isStrictNullChecksEnabled(options: ts.CompilerOptions): boolean {
  return options.strictNullChecks ?? options.strict ?? true;
}
