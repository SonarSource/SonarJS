# Adopted TypeScript front end

SonarJS owns and maintains these sources. They were adopted under MIT from the
typescript-eslint revision recorded in [upstream.json](upstream.json). Their license
is in [LICENSE](LICENSE) and is included in the bridge's third-party notices.

The adopted components are the compiler-AST converter, lexical conversion, node
maps, parser services, TypeScript scope manager, scope library definitions, visitor
keys and AST definitions. Rule implementations remain upstream dependencies.
Project discovery, program selection and ESLint orchestration live in SonarJS
outside this directory.

The source import changes only module paths, narrows converter settings to the
fields it consumes, and formats the result. The AST specification is taken from
the matching published `@typescript-eslint/types` declaration file; its string
enums also supply runtime constants. Library-global scope definitions are adopted
from upstream alongside their analyzer. They are distinct from the compiler's
`lib.*.d.ts` inputs. The parser's compiler-option-to-scope-option mapping is
adopted into `scope-options.ts` by the same synchronization script.

## Updating

The SonarJS JavaScript/TypeScript maintainers own upgrades and fixes to this fork.
For an upstream update:

1. Update the upstream plugin/parser dependencies together and record their exact
   version and commit in `upstream.json`.
2. Use a clean checkout of that commit in the canonical `~/projects/typescript-eslint`
   repository. The script checks the commit and the installed types package version.
3. Run `node tools/sync-typescript-frontend.mjs ~/projects/typescript-eslint` from
   the SonarJS root. Review every generated change. Keep intentional local fixes
   in the synchronization transformation or contribute them upstream before syncing.
4. Review compiler API additions against `packages/typescript/supported-exports.json`.
   Regenerate its ESM exports and declarations with
   `node tools/generate-typescript-exports.mjs`.
5. Run `npx tsx --tsconfig packages/tsconfig.test.json tools/check-typescript-frontend.mts
~/projects/typescript-eslint`, the bridge tests, the packaged bridge checks and
   ruling. The corpus runner compares every upstream AST-spec fixture's parse
   outcome and accepted AST/scope output with the matching upstream parser. It
   reports rejected inputs as well as accepted inputs.

`frontend.test.ts` additionally compares node maps, compiler node identities,
typed findings and fixes, source modes and JSX settings. Existing SonarJS tests
exercise frameworks, request filesystems and successive IDE analyses.
`compiler-boundary.test.ts` rejects invocation of upstream parser, converter and
scope entry points while exercising production parsing and Vue delegation.

Upstream tests and fixture history remain available at the recorded revision.
The corpus runner uses that checkout directly; it does not copy or execute fixture
code, and it does not treat an intentionally rejected input as a successful parse.
