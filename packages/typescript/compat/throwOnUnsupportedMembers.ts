// Derived from typescript-eslint native adapters; see NOTICE.md and LICENSE.
export function throwOnUnsupportedMembers<T extends object>(
  label: string,
  unsupported: ReadonlySet<string>,
  implementation: T,
): T {
  for (const property of unsupported) {
    Object.defineProperty(implementation, property, {
      get() {
        globalThis[Symbol.for('sonarjs.ts7.unsupported')]?.(`${label}#${property}`);
        throw new Error(
          `${label}#${property} is not available on the TypeScript native preview API.`,
        );
      },
    });
  }
  return implementation;
}
