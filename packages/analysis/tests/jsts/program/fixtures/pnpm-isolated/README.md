This is the pinned reproducer from [JS-2853](https://sonarsource.atlassian.net/browse/JS-2853)
and the [pnpm community report](https://community.sonarsource.com/t/191136).
The isolated linker and disabled hoisting keep `@tanstack/query-core` accessible only through
`react-query`'s virtual-store location.

From the SonarJS root, install the fixture and run its compiler-host integration check:

```sh
pnpm --dir packages/analysis/tests/jsts/program/fixtures/pnpm-isolated install --frozen-lockfile
TSX_DISABLE_CACHE=1 npx tsx --tsconfig packages/tsconfig.test.json --test --test-name-pattern='installed pnpm reproducer' packages/analysis/tests/jsts/program/compilerHost-resolution.test.ts
```

The integration check uses the analyzer's TypeScript version and verifies `Promise<void>`, all
12 query-core declaration files, parity with the ordinary TypeScript host, and relocated replay
with the recorded checkout removed. It runs on platforms with relative symlinks when the fixture
is installed. The same test file always exercises a minimal isolated-linker layout without
requiring package installation, including `preserveSymlinks`, directory-only and realpath-only
controls.
