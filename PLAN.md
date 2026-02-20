# Plan: Consolidate web analysis into WebSensor, replace CssMetricSensor

## Context

SonarJS has 4 bridge-based sensors (JsTsSensor, HtmlSensor, YamlSensor, CssRuleSensor) plus a standalone CssMetricSensor. The Node.js `analyzeProject` path already dispatches files to the correct analyzer (JS/TS, HTML, YAML, CSS). This PR:

1. Computes CSS metrics/highlighting in Node.js from PostCSS AST (replacing Java CssMetricSensor)
2. Routes ALL web files through `analyzeProject` (JsTsSensor becomes the single WebSensor)
3. Deletes HtmlSensor, YamlSensor, CssRuleSensor, and CssMetricSensor

No CPD tokens for CSS (deferred).

---

## Part 1: Node.js — CSS metrics from PostCSS AST

### 1a. Extend types — `packages/css/src/analysis/analysis.ts`

```typescript
export interface CssAnalysisOutput extends AnalysisOutput<CssIssue> {
  highlights?: CssSyntaxHighlight[];
  metrics?: CssMetrics;
}
```

Define matching types locally (same JSON shape as Java `AnalysisResponseDTO`):

- `CssLocation { startLine, startCol, endLine, endCol }`
- `CssSyntaxHighlight { location: CssLocation; textType: string }`
- `CssMetrics { ncloc: number[]; commentLines: number[]; nosonarLines: number[]; executableLines: number[]; functions: number; statements: number; classes: number; complexity: number; cognitiveComplexity: number }`

### 1b. NEW `packages/css/src/analysis/metrics.ts`

Parse with PostCSS (postcss-scss for .scss, postcss-sass for .sass, postcss-less for .less, default for .css).

**NCLOC + comment lines** — match CssMetricSensor behavior:

- Walk all nodes. For each token/node, collect lines it spans.
- Non-comment nodes (Declaration, Rule, AtRule, their punctuators) → `codeLines` set
- Comment nodes → `commentCandidates` set
- `ncloc` = sorted array from `codeLines`
- `commentLines` = sorted array from `commentCandidates − codeLines` (lines with ONLY comments)

Note: Java CssMetricSensor counts mixed lines in both sets. Our approach is slightly more standard (matching JS/TS behavior where mixed lines count only as code).

Return `CssMetrics` with ncloc/commentLines populated, everything else 0/empty.

### 1c. NEW `packages/css/src/analysis/highlighting.ts`

**Match CssMetricSensor's highlighting exactly:**

| PostCSS source                         | TextType        | CssMetricSensor equivalent                 |
| -------------------------------------- | --------------- | ------------------------------------------ |
| Comment nodes                          | `COMMENT`       | CssTokenType.COMMENT → COMMENT             |
| AtRule `@name` (e.g., @media, @import) | `ANNOTATION`    | AT_IDENTIFIER → ANNOTATION                 |
| Declaration prop (CSS property name)   | `KEYWORD_LIGHT` | IDENTIFIER followed by `:` → KEYWORD_LIGHT |
| SCSS `$variable` in declaration prop   | `KEYWORD`       | DOLLAR_IDENTIFIER → KEYWORD                |
| `#id` selectors (non-color hash)       | `KEYWORD`       | HASH_IDENTIFIER (non-hex) → KEYWORD        |
| `#hex` color values (e.g., #ff0000)    | `CONSTANT`      | HASH_IDENTIFIER (hex pattern) → CONSTANT   |
| Quoted strings in values               | `STRING`        | STRING → STRING                            |
| Numbers in values                      | `CONSTANT`      | NUMBER → CONSTANT                          |

Use `postcss-value-parser` (already a dependency) for parsing declaration values to extract strings, numbers, colors.

### 1d. Modify `packages/css/src/analysis/analyzer.ts`

After linting (issues), parse with PostCSS and compute metrics:

```typescript
if (input.sonarlint) return { issues }; // skip metrics in SonarLint
try {
  const root = parseWithPostCSS(sanitizedCode, filePath);
  return {
    issues,
    highlights: computeHighlighting(root),
    metrics: computeMetrics(root, sanitizedCode),
  };
} catch {
  return { issues };
} // graceful fallback if PostCSS parse fails
```

### 1e. Add CSS to file store — `packages/shared/src/helpers/configuration.ts`

Add `isCssFile()` to `isAnalyzableFile()` so the file store discovers CSS files during scanning:

```typescript
export function isAnalyzableFile(filePath, cssSuffixes) {
  return (
    isJsTsFile(filePath) ||
    isHtmlFile(filePath) ||
    isYamlFile(filePath) ||
    isCssFile(filePath, cssSuffixes)
  );
}
```

### 1f. Pass cssRules through HTTP bridge path

**`packages/shared/src/helpers/sanitize.ts`**:

- Add `cssRules: CssRuleConfig[]` to `SanitizedProjectAnalysisInput`
- Extract/validate `cssRules` from raw input in `sanitizeProjectAnalysisInput()`

**`packages/bridge/src/handle-request.ts`**:

- Pass `cssRules: sanitizedInput.cssRules` to `analyzeProject()`

---

## Part 2: Java — Consolidate into single WebSensor

### 2a. Add CSS to Language enum — `sonar-plugin/api/.../Language.java`

```java
CSS("css");
// update stringMap: "css" → CSS
```

### 2b. Add cssRules to request — `sonar-plugin/bridge/.../BridgeServer.java`

Add `List<StylelintRule> cssRules` field (with getter/setter) to `ProjectAnalysisRequest`.

### 2c. Make CssRules injectable

In `tools/templates/java/css-rules.template`: add `@ScannerSide` and `@SonarLintSide` annotations to CssRules class, then regenerate with `npm run generate-meta`.

Register in `JavaScriptPlugin.java` as an extension.

### 2d. Expand JsTsSensor file predicates — `JsTsSensor.java`

Inject `CssRules` via constructor. Expand `getInputFiles()`:

```java
// Current: JS/TS only
var jsTsPredicate = getJsTsPredicate(fileSystem);

// Add HTML: web language + .htm/.html
var htmlPredicate = p.and(p.hasLanguage("web"), p.or(p.hasExtension("htm"), p.hasExtension("html")));

// Add YAML: yaml language + SAM template check + Helm exclusion
var yamlPredicate = p.and(getYamlPredicate(fileSystem), input -> isSamTemplate(input, LOG));

// Add CSS: pure CSS files
var cssPredicate = p.and(p.hasType(InputFile.Type.MAIN), p.hasLanguages(CssLanguage.KEY));

// Combined
return fileSystem.inputFiles(p.or(jsTsPredicate, htmlPredicate, yamlPredicate, cssPredicate));
```

Move `isSamTemplate()` from YamlSensor to JsTsSensor (or to JavaScriptFilePredicate).

In `AnalyzeProjectHandler.getRequest()`: add `cssRules.getStylelintRules()` to the request.

### 2e. CSS issue handling in AnalysisProcessor — `AnalysisProcessor.java`

Inject `CssRules` via constructor. Modify `findRuleKey()`:

```java
private RuleKey findRuleKey(Issue issue) {
  if ("css".equals(issue.language())) {
    return cssRules != null ? cssRules.getActiveSonarKey(issue.ruleId()) : null;
  }
  return checks.ruleKeyByEslintKey(issue.ruleId(), Language.of(issue.language()));
}
```

Replace `YamlSensor.LANGUAGE`/`HtmlSensor.LANGUAGE` references with string constants (`"yaml"`, `"web"`) since those classes are being deleted.

### 2f. Delete sensors

**Delete CssRuleSensor** — `CssRuleSensor.java`

- CSS issues → now handled by AnalysisProcessor via analyzeProject
- CSS file predicates → now in JsTsSensor
- Per-file `analyzeCss` calls → replaced by `analyzeProject` batch

**Delete HtmlSensor** — `HtmlSensor.java`

- HTML files already dispatched to `analyzeHTML()` via `analyzeFile.ts`
- `initLinter` + `analyzeHtml` per-file calls → replaced by `analyzeProject`

**Delete YamlSensor** — `YamlSensor.java`

- YAML files already dispatched to `analyzeYAML()` via `analyzeFile.ts`
- `initLinter` + `analyzeYaml` per-file calls → replaced by `analyzeProject`
- Move `isSamTemplate()` to JavaScriptFilePredicate before deleting

**Delete CssMetricSensor + tokenizer** (6 files):

- `CssMetricSensor.java`, `CssLexer.java`, `Tokenizer.java`, `CssToken.java`, `CssTokenType.java`

### 2g. Update plugin registration — `JavaScriptPlugin.java`

- Remove: `HtmlSensor.class`, `YamlSensor.class`, `CssRuleSensor.class`, `CssMetricSensor.class`
- Add: `CssRules.class`

---

## Files Summary

### Node.js — New

- `packages/css/src/analysis/metrics.ts` — NCLOC/commentLines from PostCSS
- `packages/css/src/analysis/highlighting.ts` — syntax highlighting from PostCSS

### Node.js — Modify

- `packages/css/src/analysis/analysis.ts` — extend CssAnalysisOutput
- `packages/css/src/analysis/analyzer.ts` — compute metrics after linting
- `packages/shared/src/helpers/configuration.ts` — isAnalyzableFile includes CSS
- `packages/shared/src/helpers/sanitize.ts` — cssRules in SanitizedProjectAnalysisInput
- `packages/bridge/src/handle-request.ts` — pass cssRules to analyzeProject
- `packages/css/tests/analysis/analyzer.test.ts` — update tests

### Java — Modify

- `sonar-plugin/api/.../Language.java` — add CSS
- `sonar-plugin/bridge/.../BridgeServer.java` — cssRules in ProjectAnalysisRequest
- `sonar-plugin/sonar-javascript-plugin/.../JsTsSensor.java` — inject CssRules, expand predicates
- `sonar-plugin/sonar-javascript-plugin/.../AnalysisProcessor.java` — inject CssRules, CSS issue keys, replace sensor class refs with strings
- `sonar-plugin/sonar-javascript-plugin/.../JavaScriptPlugin.java` — update registrations
- `sonar-plugin/sonar-javascript-plugin/.../JavaScriptFilePredicate.java` — move isSamTemplate here
- `tools/templates/java/css-rules.template` — add @ScannerSide/@SonarLintSide

### Java — Delete

- `CssRuleSensor.java` + `CssRuleSensorTest.java`
- `HtmlSensor.java` + `HtmlSensorTest.java`
- `YamlSensor.java` + `YamlSensorTest.java`
- `CssMetricSensor.java` + `CssMetricSensorTest.java`
- `CssLexer.java`, `Tokenizer.java` + `TokenizerTest.java`, `CssToken.java`, `CssTokenType.java`

---

## Verification

1. `npx tsc -b packages` — Node.js build
2. `npx tsx --test packages/css/tests/analysis/analyzer.test.ts` — CSS metrics in output
3. `npm run generate-meta` — regenerate CssRules.java with @ScannerSide
4. `mvn compile -pl sonar-plugin -DskipTests` — Java compiles after all changes
5. Run specific Java tests: JsTsSensor, AnalysisProcessor
