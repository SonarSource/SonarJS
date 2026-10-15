# TypeScript Consumer Inventory

The generated machine-readable inventory records
compiler and semantic-utility imports and statically resolved TypeScript member
uses in production packages/*/src. Native backend implementation and declaration
files are excluded. This is an audit aid, not runtime endpoint coverage.

The compiler contract is the [owned TypeScript-compatible module](single-typescript-module.md),
not a separate SDK-free service. Both SonarJS and third-party code import that same
module. The old candidate declaration model and its service adapter were removed.

## Refresh

Run node tools/ts7-benchmark/inventory-typescript.mjs to regenerate the inventory;
add --check to validate it without writing.

Output is `tools/ts7-benchmark/out/typescript-consumer-inventory.json`, an ignored
local audit artifact rather than a large generated file in the PR.

The generator uses the default TS6 provider to resolve declaration ownership.
Changes to source locations require regenerating line references. Dynamic member
access, any-typed calls and third-party implementation details are not a complete
part of this static inventory.

## Runtime Checks

- compiler-module.test.ts checks application/dependency facade identity, direct
  SDK bypass rejection, production import boundaries and bundled parser/checker execution.
- dependency-gateway.test.ts exercises transitive dependencies, aliases, metadata,
  fake non-TS6 providers and caller-owned hosts.
- native.test.ts checks released-parser maps, native type queries, standard host
  callbacks and retained scanner/IDE project lifetimes.
