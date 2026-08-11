# Testing Library Import Helpers Design

## Goal

Share the direct Testing Library import-resolution logic used by S9153 and S9027 without changing either rule's detection scope.

## Design

Keep Testing Library-specific functionality in `rules/helpers/testing-library.ts`. The helper will resolve direct named and namespace ESM bindings and verify their source module with a caller-provided predicate. S9153 will retain subpath support and namespace imports; S9027 will retain root-package-only named `screen` imports.

The shared helper will use the existing scope lookup utilities, so it will reject shadowed values, local aliases, and non-import bindings. The existing `withStrictImportResolution` behavior remains unchanged.

## Testing

Add focused rule fixtures proving that the shared path preserves S9153's namespace/subpath behavior and S9027's strict direct-import behavior. Run both rule suites and the relevant TypeScript checks before updating the pull request.
