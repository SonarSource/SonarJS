// This file's import forces Program A (jsx:preserve) to process Component.tsx as a
// transitive dependency, caching its SourceFile without the synthesized JSX runtime import.
import type { Component } from './Component';
void 0 as unknown as typeof Component;
