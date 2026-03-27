import { deprecated } from './deprecated';

// JSX + user import: the user import is at file.imports[0].
// When jsx=react-jsx, TypeScript synthesizes a react/jsx-runtime import that should be at
// file.imports[0]. If the SourceFile is reused from a non-react-jsx program (stale cache),
// file.imports[0] is this real import instead, triggering a TypeScript internal assertion
// in getSuggestionDiagnostics: "Expected sourceFile.imports[0] to be the synthesized JSX
// runtime import"
export function Component() {
  return <span>{deprecated()}</span>;
}
