# Compiler Compatibility Translation

The node, type, checker, program, flag and unsupported-member adapters originated
in the MIT-licensed typescript-eslint native experiment (PR #12803, revision
`30d55234e6d719d3386884c3eef5c3a6c9d255f3`). The accompanying LICENSE applies to
that code. SonarJS now maintains these translation sources as part of its owned
compiler module. They are not fetched, integrity-pinned to a PR, or installed as
a typescript-eslint fork. Subsequent compatibility fixes belong here.

No parser, ESTree converter, parser-services implementation or scope analyzer is
vendored here. Released `@typescript-eslint/parser` supplies all of those,
unchanged, using this module's TS-compatible Program/AST/TypeChecker contract.
