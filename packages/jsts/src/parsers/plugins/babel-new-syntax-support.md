# Supporting New TC39 Proposals and Syntax in Babel

## How Babel's Parser Architecture Works

Babel uses the term "plugin" for two fundamentally different things:

### 1. Babel Config Plugins (external JS modules)

These are what you configure in `.babelrc` or pass in `babelOptions.plugins`. They are JavaScript modules that can:

- **Transform the AST** via the `visitor` pattern
- **Enable parser features** via the `manipulateOptions` hook
- **Replace the parser entirely** via the `parserOverride` hook

### 2. Parser Plugins (internal feature flags)

These are **strings** like `"jsx"`, `"typescript"`, `"deferredImportEvaluation"` that correspond to **hardcoded parsing logic compiled into `@babel/parser` itself**. They are NOT external modules. You cannot create new ones from outside the parser.

The full list is at https://babeljs.io/docs/babel-parser#plugins. It is finite and fixed — each entry represents parsing code that was contributed directly to `@babel/parser`'s source.

### The relationship between the two

All "syntax plugins" (e.g., `@babel/plugin-syntax-import-defer`) follow this pattern:

```js
export default function syntaxPlugin() {
  return {
    name: 'syntax-<feature>',
    manipulateOptions(opts, parserOpts) {
      parserOpts.plugins.push('<parserPluginString>');
    },
  };
}
```

They don't add parsing logic — they just **flip a switch** for logic that already exists inside `@babel/parser`. The `manipulateOptions` hook pushes a string into `parserOpts.plugins`, enabling a grammar that was already compiled into the parser.

## `@babel/parser` is Monolithic

`@babel/parser` has the **entire grammar** for JavaScript, TypeScript, Flow, and JSX hardcoded into it. For example, `@babel/plugin-transform-typescript` works because the complete TypeScript grammar is built into the parser under the `"typescript"` flag.

When TypeScript adds new syntax (e.g., `satisfies`, `using`, `const` type parameters), someone must:

1. Add the parsing logic to `@babel/parser` under the `"typescript"` flag
2. Add transform logic to `@babel/plugin-transform-typescript`

There is typically a lag between a TypeScript release and Babel support.

The Babel team has stated they "made it rather difficult to extend [the parser] on purpose."

## Options for Supporting New Syntax Not Yet in Babel

### Option A: Use an existing parser plugin string (easiest)

If Babel already supports the proposal, just enable the parser plugin. Create a syntax plugin:

```js
export default function mySyntaxPlugin() {
  return {
    name: 'syntax-my-feature',
    manipulateOptions(_, parserOpts) {
      parserOpts.plugins.push('myFeature'); // must be a known string
    },
  };
}
```

**Example:** `import defer` is supported via `"deferredImportEvaluation"` (since Babel 7.23.0).

### Option B: Contribute to `@babel/parser` upstream

Add the parsing logic directly to Babel's parser source. Once released, a trivial syntax plugin can enable it. Babel accepts PRs for proposals at any TC39 stage.

- Best long-term solution
- Depends on Babel maintainers accepting the PR
- The proposal should be stable enough

### Option C: `parserOverride` (local custom parsing)

Use the `parserOverride` hook to completely replace the parser. This is the only way to handle syntax that `@babel/parser` doesn't support, without forking or contributing upstream.

```js
export default function customSyntaxPlugin() {
  return {
    name: 'custom-syntax',
    parserOverride(code, parserOpts, parse) {
      // `code` - the original source code
      // `parserOpts` - parser options (includes plugins like "estree", "jsx", etc.)
      // `parse` - the default @babel/parser.parse function

      const transformedCode = preprocess(code);
      const ast = parse(transformedCode, parserOpts);
      // optionally post-process the AST
      return ast;
    },
  };
}
```

**Constraints:**

- Only **one** `parserOverride` per parse is allowed. Babel throws "More than one plugin attempted to override parsing" if multiple plugins define it.
- `@babel/eslint-parser` uses its own internal `parserOverride` (the `extractParserOptionsPlugin`), but handles the conflict automatically — it catches the error and retries without its own plugin, letting the user's plugin handle everything.
- The returned AST must be a valid Babel AST. `@babel/eslint-parser` will pass it through `convert.convertFile()` for ESTree conversion.
- The `parserOpts` include the `"estree"` parser plugin (added by `@babel/eslint-parser`), so delegating to `parse(code, parserOpts)` produces ESTree-compatible output.

### Option D: Fork `@babel/parser`

Fork the parser, add the new grammar, and use it via `parserOverride`. Maximum control but high maintenance cost.

## How `parserOverride` Works with `@babel/eslint-parser`

When SonarJS parses JavaScript files, the flow is:

```
buildParserOptions(input, usingBabel=true)
  → babelParserOptions() adds babelOptions with plugins
    → @babel/eslint-parser.parseForESLint(code, options)
      → normalizeParserOptions() adds "estree" to parserOpts.plugins
      → maybeParseSync(code, normalizedOptions)
```

Inside `maybeParseSync`:

1. **First attempt**: Adds `extractParserOptionsPlugin` (which has its own `parserOverride`) alongside user plugins. If the user also has a `parserOverride` plugin → "More than one plugin" error.

2. **Catches the error**, retries **without** the extract plugin:

   ```js
   options.plugins = plugins; // only user plugins
   ast = babel.parseSync(code, options);
   ```

3. `babel.parseSync` calls `@babel/core`'s parser pipeline, which invokes:

   ```js
   parserOverride(code, parserOpts, babelParser.parse);
   ```

4. The returned AST goes through `convert.convertFile(ast, code, ...)` for ESTree conversion.

5. The final ESTree AST is returned to ESLint.

## Summary Table: Proposal Support Status

| Proposal             | TC39 Stage | Babel Support | Parser Plugin String         | Approach Needed                       |
| -------------------- | ---------- | ------------- | ---------------------------- | ------------------------------------- |
| Import Defer         | Stage 3    | Yes (7.23.0+) | `"deferredImportEvaluation"` | Option A: just enable it              |
| Module Declarations  | Stage 2    | No            | N/A                          | Option C: `parserOverride`            |
| Decorators           | Stage 3    | Yes           | `"decorators"`               | Option A (already enabled in SonarJS) |
| Import Attributes    | Stage 4    | Yes           | `"importAttributes"`         | Option A                              |
| Source Phase Imports | Stage 3    | Yes           | `"sourcePhaseImports"`       | Option A                              |
| Module Expressions   | Stage 2    | Partial       | `"moduleBlocks"`             | Option A (different syntax)           |

## SonarJS-Specific Notes

- SonarJS uses `@babel/eslint-parser` for **JavaScript** files only. TypeScript files use `@typescript-eslint/parser` (which delegates to the TypeScript compiler directly — no Babel involvement, no lag).
- Babel config is in `packages/jsts/src/parsers/options.ts`, function `babelParserOptions()`.
- Plugins go in the `babelOptions.plugins` array alongside the decorators plugin.
- Custom plugin files live in `packages/jsts/src/parsers/plugins/`.
