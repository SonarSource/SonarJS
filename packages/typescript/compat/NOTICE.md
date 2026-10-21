# Compiler syntax compatibility

`constants.json` defines the versioned numeric values of SonarJS's compiler contract.
`syntax.cjs` contains stateless syntax predicates and traversal helpers adopted from
Microsoft TypeScript under Apache-2.0. The source version and SHA-256 are pinned in
`provenance.json`; `LICENSE` retains the upstream terms.

Regenerate or verify with `node tools/sync-typescript-compat.mjs [--check]`.
The script derives required public helpers from `supported-exports.json`, excludes
provider-owned operations recorded in `provider-operations.json` and shared helpers,
and follows their local
syntax dependencies. It rejects a different source revision and dependencies on
compiler creation, resolution or filesystem state. Review the provenance pin and
contract compatibility when intentionally updating this adoption.

This module operates on normalized SonarJS nodes and can be shared by in-process,
IPC and WASM providers. It does not load a TypeScript SDK. Configuration parsing,
source parsing, binding, checking and module resolution belong to the selected
provider. Handwritten compatibility operations live in `helpers.cjs`.

`index.cjs` is the shared entry point. Its public names and `provider-operations.json`
partition the supported contract; conformance tests reject gaps or overlapping ownership.
The TS6 reference provider retains its SDK syntax implementations; the shared adoption
is generated from that same pinned SDK for providers with normalized objects.
