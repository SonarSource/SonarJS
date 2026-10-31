export const compilerEntry: RegExp;
export const supportedRoot: RegExp;
export const metadataEntry: RegExp;
export const controlEntries: ReadonlySet<string>;
export function getImplementationRoots(ownedRoot: string, classicRoot: string): string[];
export function findCompilerRoot(
  file: string,
  cache: Map<string, string | undefined>,
  ownedRoot: string,
): string | undefined;
