# Vercel TS7 provider

The node, checker, type, modifier and flag adapters were derived from the MIT-licensed
typescript-eslint native compiler experiment, PR #12803, revision
`30d55234e6d719d3386884c3eef5c3a6c9d255f3`, and the subsequent SonarJS TS7 benchmark.
They have been modified to consume Vercel's in-process compiler objects instead of
the native compiler's remote handles and IPC queries. The original MIT license is
preserved in LICENSE.

The compiler source is maintained by Vercel at https://github.com/vercel-labs/tsc-ts.
Its immutable revision is defined by the `tsc-ts-source` dependency in the root
package.json. Its Apache-2.0 LICENSE and THIRD_PARTY_NOTICES.md are included in the
packaged analyzer's licenses directory.

Declaration libraries are copied from the pinned `@typescript/native-preview`
distribution, independently of the TS6 reference dependency. Only `lib*.d.ts`
resources ship; its native executable is not included. The distribution's Apache
license and third-party notices are included by license-management.mjs.

The provider uses SonarJS's shared stateless syntax compatibility module. Its
separate Apache provenance and regeneration instructions are in
`packages/typescript/compat/NOTICE.md`.
