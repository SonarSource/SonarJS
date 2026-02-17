# Plan: Add CSS Analysis Support to gRPC Server

## Problem

The gRPC server (`packages/grpc`) currently only supports JavaScript and TypeScript analysis. CSS files sent to A3S are received by the JSTS analyzer but produce zero issues because:

1. `transformActiveRule` in `packages/grpc/src/transformers/request.ts:346` rejects any rule with repository other than `javascript` or `typescript`
2. The gRPC handler (`packages/grpc/src/service.ts`) only calls `analyzeProject()` which handles JS/TS/HTML/YAML via ESLint — it never calls `analyzeCSS()` from `packages/css/src/analysis/analyzer.ts`

CSS analysis in SonarJS uses **stylelint** (not ESLint), with a completely separate code path.

## Background: How CSS Analysis Works in the Bridge (SonarQube Plugin)

In the SonarQube bridge (`packages/bridge/src/handle-request.ts`):

- The Java plugin sends an `on-analyze-css` request with:
  - `filePath`, `fileContent` (same as gRPC)
  - `rules`: array of `{ key: string, configurations: any[] }` where `key` is the **stylelint rule key** (e.g. `"font-family-no-duplicate-names"`)
- The bridge calls `analyzeCSS(input, ...)` from `packages/css/src/analysis/analyzer.ts`
- `analyzeCSS` creates a stylelint config via `createStylelintConfig(rules)` and lints the file

**Key difference**: The Java plugin translates SonarQube rule keys (e.g. `css:S4648`) to stylelint keys (e.g. `font-family-no-duplicate-names`) before sending to the bridge. Each CSS rule has a Java class with a `stylelintKey()` method (e.g. `sonar-plugin/css/src/main/java/org/sonar/css/rules/FontFamilyNoDuplicateNames.java`).

## Background: How CSS Rules Arrive via gRPC (A3S)

In A3S, the Hub fetches active rules from the quality profile and sends them to the JSTS analyzer via gRPC. CSS rules arrive with:

- `ruleKey.repo = "css"`
- `ruleKey.rule = "S4648"` (the SonarQube key, NOT the stylelint key)

The gRPC server needs to:

1. Accept `css` repository rules
2. Map SonarQube CSS rule keys (S4648) to stylelint keys (font-family-no-duplicate-names)
3. Detect CSS files and route them to `analyzeCSS()` instead of `analyzeProject()`

## Implementation Plan

### 1. Create a CSS rule key mapping (`packages/grpc/src/transformers/css-rule-metadata.ts`)

Build a static map from SonarQube key → stylelint key. Source: `sonar-plugin/css/src/main/java/org/sonar/css/rules/*.java` files, each has `@Rule(key = "S4648")` and `stylelintKey()` returning the stylelint key.

There are about 29 CSS rules. Extract them into:

```typescript
export const cssRuleKeyMap = new Map<string, string>([
  ['S4648', 'font-family-no-duplicate-names'],
  ['S4649', 'font-family-no-missing-generic-family-keyword'],
  ['S4654', 'block-no-empty'],
  // ... etc
]);
```

You can find all mappings by running:

```bash
grep -r "stylelintKey\|@Rule" sonar-plugin/css/src/main/java/org/sonar/css/rules/*.java
```

Note: SonarJS also has 5 custom stylelint rules (S125, S5362, S7923, S7924, S7925) in `packages/css/src/rules/`. These use the `sonarjs/` prefix convention for their stylelint keys. Check `packages/css/src/rules/*/index.ts` for the exact keys.

### 2. Add CSS rule transformation to `packages/grpc/src/transformers/request.ts`

Modify `transformActiveRule()`:

```typescript
// Current code at line 346:
if (repo !== 'javascript' && repo !== 'typescript') {
  console.warn(`Ignoring rule ...`);
  return [];
}

// Change to:
if (repo === 'css') {
  return transformCssActiveRule(ruleKey, activeRule.params || []);
}
if (repo !== 'javascript' && repo !== 'typescript') {
  console.warn(`Ignoring rule ...`);
  return [];
}
```

Add a new function `transformCssActiveRule()` that:

- Looks up the stylelint key from `cssRuleKeyMap`
- Returns a `CssRuleConfig` (not a `RuleConfig` — different type for CSS)
- Handles params transformation (CSS rules rarely have params, but some do)

You'll need a separate collection for CSS rules since they use `CssRuleConfig` (from `packages/css/src/linter/config.ts`), not the ESLint `RuleConfig`.

### 3. Modify `transformRequestToProjectInput` to separate CSS rules

The function currently returns `ProjectAnalysisInput` with JS/TS rules. It needs to also return CSS rules separately. Consider changing the return type:

```typescript
interface GrpcAnalysisInput {
  projectInput: ProjectAnalysisInput; // JS/TS rules for analyzeProject()
  cssRules: CssRuleConfig[]; // CSS rules for analyzeCSS()
}
```

Or create a new function `transformCssRulesFromRequest()`.

### 4. Modify `packages/grpc/src/service.ts` to handle CSS files

In `analyzeFileHandler`, after the current `analyzeProject()` call, add CSS analysis:

```typescript
// Detect if any source files are CSS/SCSS/LESS/SASS
const cssFiles = (request.sourceFiles || []).filter(
  f => isCssFile(f.relativePath), // .css, .scss, .sass, .less, .vue (has <style>)
);

if (cssFiles.length > 0 && cssRules.length > 0) {
  for (const cssFile of cssFiles) {
    const cssInput: CssAnalysisInput = {
      filePath: cssFile.relativePath,
      fileContent: cssFile.content,
      rules: cssRules,
    };
    const cssOutput = await analyzeCSS(cssInput, shouldIgnoreParams);
    // Merge cssOutput.issues into the response
  }
}
```

Use `isCssFile()` from `packages/shared/src/helpers/configuration.ts` to detect CSS files. Note that `.vue` files contain `<style>` blocks that stylelint can analyze — stylelint's `postcss-html` custom syntax handles this.

### 5. Transform CSS issues back to gRPC response

CSS issues from `analyzeCSS` have a different format than JS/TS issues (they come from stylelint, not ESLint). The response transformer (`packages/grpc/src/transformers/response.ts`) needs to handle CSS issues:

- Map stylelint rule key back to `css:S4648` format for the `rule` field
- Convert stylelint issue positions to the gRPC `TextRange` format

### 6. Add tests

Add to `packages/grpc/tests/server.test.ts`:

```typescript
it('should analyze CSS file with CSS rules', async () => {
    const request = {
        analysisId: generateAnalysisId(),
        contextIds: {},
        sourceFiles: [{
            relativePath: '/project/src/styles.css',
            content: 'a { font-family: Arial, Arial; }',  // Triggers S4648
        }],
        activeRules: [{
            ruleKey: { repo: 'css', rule: 'S4648' },
            params: [],
        }],
    };
    const response = await client.analyze(request);
    expect(response.issues.length).toBe(1);
    expect(response.issues[0].rule.repo).toBe('css');
    expect(response.issues[0].rule.rule).toBe('S4648');
});

it('should analyze SCSS file', async () => { ... });
it('should analyze Vue file with <style> block', async () => { ... });
it('should handle mixed JS+CSS rules for Vue files', async () => { ... });
```

## Files to Modify

1. **New:** `packages/grpc/src/transformers/css-rule-metadata.ts` — SQ key → stylelint key map
2. **Modify:** `packages/grpc/src/transformers/request.ts` — accept `css` repo, transform CSS rules
3. **Modify:** `packages/grpc/src/service.ts` — detect CSS files, call `analyzeCSS()`
4. **Modify:** `packages/grpc/src/transformers/response.ts` — handle CSS issues in response
5. **Modify:** `packages/grpc/tests/server.test.ts` — add CSS tests

## Key Dependencies

- `packages/css/src/analysis/analyzer.ts` — `analyzeCSS()` function
- `packages/css/src/linter/config.ts` — `createStylelintConfig()`, `RuleConfig` type
- `packages/shared/src/helpers/configuration.ts` — `isCssFile()` helper
- `sonar-plugin/css/src/main/java/org/sonar/css/rules/*.java` — source of truth for SQ→stylelint key mapping

## Important Notes

- CSS analysis uses stylelint (not ESLint) — completely separate engine
- The SQ→stylelint key mapping is currently only in Java code; it needs to be duplicated in TypeScript
- `.vue` files contain both JS/TS and CSS — both `analyzeProject()` and `analyzeCSS()` should run for these files
- CSS rules have very few configurable parameters — most are just on/off
- The 5 custom SonarJS CSS rules (S125, S5362, S7923, S7924, S7925) are registered as stylelint plugins in `packages/css/src/rules/`
