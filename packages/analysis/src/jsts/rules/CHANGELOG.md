## 2026-07-14, Version 4.2.0

* [[JS-2043](https://sonarsource.atlassian.net/browse/JS-2043)] - S8988: Create decorated rule for `vue/no-side-effects-in-computed-properties`
* [[JS-2018](https://sonarsource.atlassian.net/browse/JS-2018)] - Fix S2699 Node assert strict detection
* [[JS-2016](https://sonarsource.atlassian.net/browse/JS-2016)] - S8984: Import `vue/valid-v-for` as an external rule
* [[JS-2000](https://sonarsource.atlassian.net/browse/JS-2000)] - Refactor S8786 hot spots without behavior changes
* [[JS-1999](https://sonarsource.atlassian.net/browse/JS-1999)] - S8982: Import `vue/require-v-for-key` as an external rule
* [[JS-1997](https://sonarsource.atlassian.net/browse/JS-1997)] - Fix FP on S1848: S1848 should not report RegExp constructors used only for syntax validation
* [[JS-1996](https://sonarsource.atlassian.net/browse/JS-1996)] - Fix SonarQube Next quality gate issues
* [[JS-1994](https://sonarsource.atlassian.net/browse/JS-1994)] - S8780: false positive when async assertion is used alongside a done callback
* [[JS-1993](https://sonarsource.atlassian.net/browse/JS-1993)] - S5906: clarify that length matchers apply beyond collections
* [[JS-1992](https://sonarsource.atlassian.net/browse/JS-1992)] - Fix S5914: narrow to trivially-true assertions
* [[JS-1991](https://sonarsource.atlassian.net/browse/JS-1991)] - S5914: narrow to trivially-true assertions
* [[JS-1990](https://sonarsource.atlassian.net/browse/JS-1990)] - S5914: Assertions should not be trivially true
* [[JS-1975](https://sonarsource.atlassian.net/browse/JS-1975)] - Implement private assertion layer for assertions-in-tests
* [[JS-1972](https://sonarsource.atlassian.net/browse/JS-1972)] - S8784: false positive on Vitest type-level assertions (expectTypeOf / assertType) at the top level
* [[JS-1971](https://sonarsource.atlassian.net/browse/JS-1971)] - S8785: extend detection to synchronous describe calling an unawaited async helper
* [[JS-1963](https://sonarsource.atlassian.net/browse/JS-1963)] - Fix FP on S2871: comparison-only default sorts used for order normalization
* [[JS-1962](https://sonarsource.atlassian.net/browse/JS-1962)] - S8962 - Import `vue/require-typed-ref` rule
* [[JS-1960](https://sonarsource.atlassian.net/browse/JS-1960)] - S8960: Test and hook callbacks should use a single completion style
* [[JS-1959](https://sonarsource.atlassian.net/browse/JS-1959)] - S8961 - Import `vue/require-explicit-emits` rule
* [[JS-1957](https://sonarsource.atlassian.net/browse/JS-1957)] - S8959: UI test debug commands should not be used
* [[JS-1956](https://sonarsource.atlassian.net/browse/JS-1956)] - S8957 - Import `vue/require-prop-types` rule
* [[JS-1955](https://sonarsource.atlassian.net/browse/JS-1955)] - S8951 - Import `vue/no-mutating-props` rule
* [[JS-1952](https://sonarsource.atlassian.net/browse/JS-1952)] - S8950 - Import `vue/no-required-prop-with-default` rule 
* [[JS-1950](https://sonarsource.atlassian.net/browse/JS-1950)] - S5906 suggests Jest length matcher for Jasmine global expect in mixed test dependencies
* [[JS-1946](https://sonarsource.atlassian.net/browse/JS-1946)] - Fix FP on S6759: S6759 should not report non-React TSX components
* [[JS-1943](https://sonarsource.atlassian.net/browse/JS-1943)] - S2925: Remove Promise-based fixed wait detection
* [[JS-1937](https://sonarsource.atlassian.net/browse/JS-1937)] - S8932: Lodash memoize calls should provide an explicit cache key function
* [[JS-1934](https://sonarsource.atlassian.net/browse/JS-1934)] - S5976: Similar tests should be grouped in a single Parameterized test
* [[JS-1929](https://sonarsource.atlassian.net/browse/JS-1929)] - S8927: Default imports from modular utility libraries should not be used
* [[JS-1927](https://sonarsource.atlassian.net/browse/JS-1927)] - Create new rule S8784: Assertions should be placed inside test cases or hooks
* [[JS-1916](https://sonarsource.atlassian.net/browse/JS-1916)] - S6268 Reduce false positives for locally-assigned hardcoded values
* [[JS-1910](https://sonarsource.atlassian.net/browse/JS-1910)] - Create new rule S8785: Test suite callbacks should be synchronous functions
* [[JS-1901](https://sonarsource.atlassian.net/browse/JS-1901)] - Remove accidental rspec.sha and tighten source-type follow-ups
* [[JS-1898](https://sonarsource.atlassian.net/browse/JS-1898)] - Add check for multer sub-function
* [[JS-1890](https://sonarsource.atlassian.net/browse/JS-1890)] - Create rule S8783: Forced browser interactions should not bypass actionability checks
* [[JS-1889](https://sonarsource.atlassian.net/browse/JS-1889)] - S2925 No fixed waits in tests
* [[JS-1880](https://sonarsource.atlassian.net/browse/JS-1880)] - Create rule S8782: Lifecycle hooks should be declared before test cases
* [[JS-1873](https://sonarsource.atlassian.net/browse/JS-1873)] - S8781: Test and suite titles should not be empty or whitespace-only
* [[JS-1828](https://sonarsource.atlassian.net/browse/JS-1828)] - Add stylelint rule "at-rule-descriptor-no-unknown"
* [[JS-1825](https://sonarsource.atlassian.net/browse/JS-1825)] - S5852: only report in case of exponential backtracking + add rule S8786
* [[JS-1795](https://sonarsource.atlassian.net/browse/JS-1795)] - Fix FP on S1848: Constructors with side-effect initialization not recognized
* [[JS-1789](https://sonarsource.atlassian.net/browse/JS-1789)] - Fix S4782 false negative when optional property type alias includes `undefined`
* [[JS-1759](https://sonarsource.atlassian.net/browse/JS-1759)] - Implement S119 for TypeScript type parameter names
* [[JS-1686](https://sonarsource.atlassian.net/browse/JS-1686)] - S1244: Floating point numbers should not be tested for equality
* [[JS-1597](https://sonarsource.atlassian.net/browse/JS-1597)] - Identify generated JS/TS files via generator tooling and filter only non-relevant rules
* [[JS-1077](https://sonarsource.atlassian.net/browse/JS-1077)] - Fix FP S2699 (`assertions-in-tests`): Support 'should' assertions
* [[JS-1011](https://sonarsource.atlassian.net/browse/JS-1011)] - S8907: Replace Lodash/underscore.js methods with native APIs

## 2026-06-18, Version 4.1.0

* [[JS-1880](https://sonarsource.atlassian.net/browse/JS-1880)] - Create rule S8782: Lifecycle hooks should be declared before test cases
* [[JS-1877](https://sonarsource.atlassian.net/browse/JS-1877)] - S5332: Port CleartextProtocolFilter safe-URL logic to TypeScript
* [[JS-1871](https://sonarsource.atlassian.net/browse/JS-1871)] - S8780: Async test assertions should be awaited or returned
* [[JS-1870](https://sonarsource.atlassian.net/browse/JS-1870)] - Remove deprecated rules S2255, S4784, S4787, S4817, S4818, S4823, S4829, S5742, S5743, S6245, S6299
* [[JS-1867](https://sonarsource.atlassian.net/browse/JS-1867)] - S4790 should not raise when the hash output is truncated/sliced
* [[JS-1862](https://sonarsource.atlassian.net/browse/JS-1862)] - S8754: Test titles should be unique within the same suite
* [[JS-1825](https://sonarsource.atlassian.net/browse/JS-1825)] - S5852: only report in case of exponential backtracking + add rule S8786
* [[JS-1823](https://sonarsource.atlassian.net/browse/JS-1823)] - S5906: FP in Jasmine quickfix suggestions for toHaveLength
* [[JS-1810](https://sonarsource.atlassian.net/browse/JS-1810)] - S6281: Adjust detection logic for AWS CDK BlockPublicAccess changes
* [[JS-1802](https://sonarsource.atlassian.net/browse/JS-1802)] - Fix S3801 false positives for React effect cleanups
* [[JS-1790](https://sonarsource.atlassian.net/browse/JS-1790)] - S5725: Restrict rule to statically versioned URLs
* [[JS-1789](https://sonarsource.atlassian.net/browse/JS-1789)] - Fix S4782 false negative when optional property type alias includes `undefined`
* [[JS-1776](https://sonarsource.atlassian.net/browse/JS-1776)] - Update S5845 issue wording
* [[JS-1775](https://sonarsource.atlassian.net/browse/JS-1775)] - Fix FP on S4782: Fix S4782: false positive when optional property type is exactly undefined
* [[JS-1707](https://sonarsource.atlassian.net/browse/JS-1707)] - Fix FP on S5868: Unicode ranges flagged as grapheme clusters in character classes
* [[JS-1706](https://sonarsource.atlassian.net/browse/JS-1706)] - Fix FP on S5868: Unicode in variables concatenated into regex character classes
* [[JS-1694](https://sonarsource.atlassian.net/browse/JS-1694)] - JS 1688 extend dependencies cache with versions
* [[JS-1692](https://sonarsource.atlassian.net/browse/JS-1692)] - S8686: Assertions should not be conditional
* [[JS-1688](https://sonarsource.atlassian.net/browse/JS-1688)] - Extend dependenciesCache to store dependency versions alongside names
* [[JS-1687](https://sonarsource.atlassian.net/browse/JS-1687)] - S5906: The most specific assertion should be used
* [[JS-1685](https://sonarsource.atlassian.net/browse/JS-1685)] - Fix FP S6759 readonly props inherited from Readonly base
* [[JS-1682](https://sonarsource.atlassian.net/browse/JS-1682)] - Fix FN S6324 false negatives in printable ranges
* [[JS-1680](https://sonarsource.atlassian.net/browse/JS-1680)] - Fix S7780 quickfix: Applying quickfix may introduce S4624 issues
* [[JS-1678](https://sonarsource.atlassian.net/browse/JS-1678)] - S5845: Assertions comparing incompatible types should not be made
* [[JS-1677](https://sonarsource.atlassian.net/browse/JS-1677)] - S5914: Assertions should not be trivially true or false
* [[JS-1651](https://sonarsource.atlassian.net/browse/JS-1651)] - Recognize test.prop and it.prop from @fast-check/vitest in S2187
* [[JS-1649](https://sonarsource.atlassian.net/browse/JS-1649)] - Enable rules dynamically based on per-file import declarations
* [[JS-1609](https://sonarsource.atlassian.net/browse/JS-1609)] - Clean up accepted issues in SonarJS self-analysis
* [[JS-1608](https://sonarsource.atlassian.net/browse/JS-1608)] - Port TS6 rule FP fixes from #6626
* [[JS-1576](https://sonarsource.atlassian.net/browse/JS-1576)] - Upgrade to TypeScript 6
* [[JS-1550](https://sonarsource.atlassian.net/browse/JS-1550)] - Don't bundle slf4j in the plugin
* [[JS-1541](https://sonarsource.atlassian.net/browse/JS-1541)] - Expand S6437 coverage
* [[JS-1528](https://sonarsource.atlassian.net/browse/JS-1528)] - Fix FP on S2871: Sorted comparisons where both sides use identical sort logic
* [[JS-1501](https://sonarsource.atlassian.net/browse/JS-1501)] - Move MAIN/TEST fallback heuristic to linter layer; remove rule-level filename gating
* [[JS-1491](https://sonarsource.atlassian.net/browse/JS-1491)] - Fix FP on S2392: Loop counter variables reused across separate loops
* [[JS-1462](https://sonarsource.atlassian.net/browse/JS-1462)] - Fix FP on S6582: Multi-condition logic with && and || cannot use optional chaining
* [[JS-1423](https://sonarsource.atlassian.net/browse/JS-1423)] - Fix FP on S7778: Methods accepting only a single argument incorrectly flagged as combinable
* [[JS-1316](https://sonarsource.atlassian.net/browse/JS-1316)] - Resolve catalog: references from Bun's package.json catalog fields
* [[JS-736](https://sonarsource.atlassian.net/browse/JS-736)] - Search for deno.json files during lookup
* [[JS-366](https://sonarsource.atlassian.net/browse/JS-366)] - Fully support JSX syntax in S125 (`no-commented-code`)

## 2026-04-16, Version 4.0.3

- [[JS-1540](https://sonarsource.atlassian.net/browse/JS-1540)] - Strengthen Rule S2077 with new detection
- [[JS-1518](https://sonarsource.atlassian.net/browse/JS-1518)] - Fix FP on S1301: TypeScript exhaustiveness checking with never type assertions
- [[JS-1505](https://sonarsource.atlassian.net/browse/JS-1505)] - Fix S1874: crash when analyzing TSX files with react-jsx in monorepos
- [[JS-1500](https://sonarsource.atlassian.net/browse/JS-1500)] - Refactor analysis artifact computation to reduce redundant AST traversals
- [[JS-1494](https://sonarsource.atlassian.net/browse/JS-1494)] - Fix S6418 legacy decimal parameter crash and add scanner smoke tests
- [[JS-1493](https://sonarsource.atlassian.net/browse/JS-1493)] - Fix open SonarCloud maintainability issues
- [[JS-1489](https://sonarsource.atlassian.net/browse/JS-1489)] - Fix FP on S3699: void functions flagged when called as statements
- [[JS-1488](https://sonarsource.atlassian.net/browse/JS-1488)] - Fix FP on S125: Documentation examples and API usage patterns flagged as dead code
- [[JS-1487](https://sonarsource.atlassian.net/browse/JS-1487)] - Fix FP on S125: Commented code with TODO/FIXME markers incorrectly flagged
- [[JS-1481](https://sonarsource.atlassian.net/browse/JS-1481)] - Fix FP on S2301: Event handler callbacks with boolean state parameters
- [[JS-1466](https://sonarsource.atlassian.net/browse/JS-1466)] - Fix FP on S1121: Assignment in conditional expressions for idiomatic patterns
- [[JS-1460](https://sonarsource.atlassian.net/browse/JS-1460)] - chore: evaluate TypeScript 6.0.1-rc
- [[JS-1439](https://sonarsource.atlassian.net/browse/JS-1439)] - Fix S2068: hardcoded credentials in template literals are not detected
- [[JS-1436](https://sonarsource.atlassian.net/browse/JS-1436)] - Fix S1126: suggestion drops comments inside if block
- [[JS-1429](https://sonarsource.atlassian.net/browse/JS-1429)] - Fix S4030: crash when linting Svelte use: directives
- [[JS-1422](https://sonarsource.atlassian.net/browse/JS-1422)] - Fix FP on S2234: Intentional parameter swap in ternary branch with paired normal-order call
- [[JS-1421](https://sonarsource.atlassian.net/browse/JS-1421)] - Fix FP on S2234: Intentional argument reversal in comparator wrapper functions
- [[JS-1406](https://sonarsource.atlassian.net/browse/JS-1406)] - Improve S2068: Fix FPs due to transition from hotspot to vuln
- [[JS-1404](https://sonarsource.atlassian.net/browse/JS-1404)] - Create a DOMPurify analysis rule
- [[JS-1365](https://sonarsource.atlassian.net/browse/JS-1365)] - Fix FP on S2234: Intentional parameter swap in RTL/LTR direction handlers
- [[JS-1360](https://sonarsource.atlassian.net/browse/JS-1360)] - Fix FP on S1119: Labels for multi-level loop exits in nested iteration
- [[JS-1321](https://sonarsource.atlassian.net/browse/JS-1321)] - Fix FP on S101: Dollar sign prefix convention for internal types not recognized
- [[JS-1308](https://sonarsource.atlassian.net/browse/JS-1308)] - Fix FP on S3516: Same return value with different semantic meanings
- [[JS-1307](https://sonarsource.atlassian.net/browse/JS-1307)] - Fix FP on S3516: Functions with intentional invariant returns for chaining
- [[JS-1302](https://sonarsource.atlassian.net/browse/JS-1302)] - Fix FP on S3800: Functions wrapping external calls with unknown return types
- [[JS-1300](https://sonarsource.atlassian.net/browse/JS-1300)] - Fix FP on S2871: Default sort for string arrays in logging and data structures
- [[JS-1193](https://sonarsource.atlassian.net/browse/JS-1193)] - Improve generate-java-rule-classes.ts to escape backslashes in generated Java classes
- [[JS-606](https://sonarsource.atlassian.net/browse/JS-606)] - Rule S6440 running endlessly

## 2026-03-10, Version 4.0.2

- [[JS-1364](https://sonarsource.atlassian.net/browse/JS-1364)] - Fix FP on S2234: MD5/crypto algorithm parameter rotation patterns
- [[JS-1361](https://sonarsource.atlassian.net/browse/JS-1361)] - Fix FP on S1119: Labels used for control flow within switch statements
- [[JS-1360](https://sonarsource.atlassian.net/browse/JS-1360)] - Fix FP on S1119: Labels for multi-level loop exits in nested iteration
- [[JS-1122](https://sonarsource.atlassian.net/browse/JS-1122)] - Fix FP on S2310: Array splice with compensating counter decrement pattern
- [[JS-139](https://sonarsource.atlassian.net/browse/JS-139)] - Fix FP S2201 (`no-ignored-return`): "Return values from functions without side effects should not be ignored" triggering on `Array#find`

## 2026-03-06, Version 4.0.1

- [[JS-1400](https://sonarsource.atlassian.net/browse/JS-1400)] - Get rid of no-script-url for FP reduction
- [[JS-1337](https://sonarsource.atlassian.net/browse/JS-1337)] - Use trie-based directory grouping for TypeScript program creation
- [[JS-1336](https://sonarsource.atlassian.net/browse/JS-1336)] - Fix infinite loop in getFullyQualifiedNameTS when import is shadowed
- [[JS-1335](https://sonarsource.atlassian.net/browse/JS-1335)] - Add ESLint v10 support; remove code-eval, enforce-trailing-comma, super-invocation from eslint-plugin-sonarjs
- [[JS-1333](https://sonarsource.atlassian.net/browse/JS-1333)] - fix(S7790): Prevent references to target FQNs from raising
- [[JS-1325](https://sonarsource.atlassian.net/browse/JS-1325)] - Fix FP on S3403: Parameter undefined checks flagged as always false
- [[JS-1301](https://sonarsource.atlassian.net/browse/JS-1301)] - Fix FP on S3800: Functions with consistent return types flagged as mixed
- [[JS-1238](https://sonarsource.atlassian.net/browse/JS-1238)] - Create JS rule
- [[JS-1179](https://sonarsource.atlassian.net/browse/JS-1179)] - Fix FP on S5850: Regex anchors with alternation for trimming operations
- [[JS-1135](https://sonarsource.atlassian.net/browse/JS-1135)] - Fix FP on S3735: Union types containing Promise and void/undefined
- [[JS-1123](https://sonarsource.atlassian.net/browse/JS-1123)] - Fix FP on S7718: Minified code with auto-generated catch parameter names
- [[JS-1115](https://sonarsource.atlassian.net/browse/JS-1115)] - Fix FP on S4335: string & {} and number & {} patterns for type autocomplete
- [[JS-1044](https://sonarsource.atlassian.net/browse/JS-1044)] - Implement the health check gRPC API
- [[JS-290](https://sonarsource.atlassian.net/browse/JS-290)] - Fix FP S4165 (`no-redundant-assignments`)

## 2026-02-18, Version 4.0.0

- [[JS-1335](https://sonarsource.atlassian.net/browse/JS-1335)] - Add ESLint v10 support; remove code-eval, enforce-trailing-comma, super-invocation from eslint-plugin-sonarjs
- [[JS-1333](https://sonarsource.atlassian.net/browse/JS-1333)] - fix(S7790): Prevent references to target FQNs from raising
- [[JS-1238](https://sonarsource.atlassian.net/browse/JS-1238)] - Create JS rule
- [[JS-1121](https://sonarsource.atlassian.net/browse/JS-1121)] - Fix FP on S2310: Intentional loop counter skip-ahead in parsing code

## 2026-02-11, Version 3.0.7

- [[JS-1232](https://sonarsource.atlassian.net/browse/JS-1232)] - Add AWS TLS PFS policies to the valid ones
- [[JS-1227](https://sonarsource.atlassian.net/browse/JS-1227)] - perf: Optimize S125 commented-out code detection
- [[JS-1214](https://sonarsource.atlassian.net/browse/JS-1214)] - feat (S5247): Add support for Swig
- [[JS-1209](https://sonarsource.atlassian.net/browse/JS-1209)] - feat(S6437): Add support for express-session
- [[JS-1208](https://sonarsource.atlassian.net/browse/JS-1208)] - feat(S6418): Add support for MemberExpression
- [[JS-1206](https://sonarsource.atlassian.net/browse/JS-1206)] - feat (S6437): Add ldapjs
- [[JS-1198](https://sonarsource.atlassian.net/browse/JS-1198)] - Fix S2234 performance issue with complex destructuring patterns
- [[JS-1197](https://sonarsource.atlassian.net/browse/JS-1197)] - feat: add branded types for Unix path handling
- [[JS-1194](https://sonarsource.atlassian.net/browse/JS-1194)] - feat(S2077): Add use getFullyQualifiedname & add sqlite3
- [[JS-1170](https://sonarsource.atlassian.net/browse/JS-1170)] - Test: trigger ruling failure
- [[JS-1143](https://sonarsource.atlassian.net/browse/JS-1143)] - feat(S6437): Add support for object-based signatures
- [[JS-946](https://sonarsource.atlassian.net/browse/JS-946)] - Implement direct TypeScript program caching

## 2026-01-27, Version 3.0.6

- [[JS-1143](https://sonarsource.atlassian.net/browse/JS-1143)] - feat(S6437): Add support for object-based signatures
- [[JS-1128](https://sonarsource.atlassian.net/browse/JS-1128)] - Fix: Update crypto.verify in S6437
- [[JS-1026](https://sonarsource.atlassian.net/browse/JS-1026)] - Fix S2137, S2424, S2703 to use globals npm package instead of internal deprecated list
- [[JS-955](https://sonarsource.atlassian.net/browse/JS-955)] - Fix S1541: Support nullish coalescing operator
- [[JS-926](https://sonarsource.atlassian.net/browse/JS-926)] - Fix rule S1444: Should only raise in Typescript files in eslint-plugin-sonarjs
- [[JS-754](https://sonarsource.atlassian.net/browse/JS-754)] - S6418: Should handle ternary expression and obejct assignments
- [[JS-638](https://sonarsource.atlassian.net/browse/JS-638)] - Fix S4721 (`os-command`) location error
- [[JS-487](https://sonarsource.atlassian.net/browse/JS-487)] - Fix S6759: crash when using return outside of a function
- [[JS-486](https://sonarsource.atlassian.net/browse/JS-486)] - Improve S2004 (`no-nested-functions`): ignore test functions
- [[JS-485](https://sonarsource.atlassian.net/browse/JS-485)] - Fix rule S1135 (`todo-tag`): ignore use of todo on eslint pragma comments
- [[JS-384](https://sonarsource.atlassian.net/browse/JS-384)] - S1854 Useless assignment false-positive when using variables in try/catch blocks
- [[JS-106](https://sonarsource.atlassian.net/browse/JS-106)] - FP in S3801 when `throw` is in child functions
- [[JS-90](https://sonarsource.atlassian.net/browse/JS-90)] - Fix FP S3801 (`no-inconsistent-returns`): Ignore switch handling all variants

## 2025-08-25, Version 3.0.5

- [[JS-834](https://sonarsource.atlassian.net/browse/JS-834)] - Add missing tailwindCSS directive @theme to rule S4662
- [[JS-804](https://sonarsource.atlassian.net/browse/JS-804)] - Improve S2187: Add a few more test fqns
- [[JS-719](https://sonarsource.atlassian.net/browse/JS-719)] - Replace dependency jsx-ast-utils with jsx-ast-utils-x
- [[JS-685](https://sonarsource.atlassian.net/browse/JS-685)] - Modify S2301 (`no-selector-parameter`): Add exception when selector parameter is an object property
- [[ESLINTJS-35](https://sonarsource.atlassian.net/browse/ESLINTJS-35)] - `prefer-immediate-return`: allow cases where a type hint is used
- [[ESLINTJS-24](https://sonarsource.atlassian.net/browse/ESLINTJS-24)] - `no-duplicate-string` rule false positive on "isObjectPropertyKey" of Proxy
- [[ESLINTJS-20](https://sonarsource.atlassian.net/browse/ESLINTJS-20)] - `prefer-single-boolean-return`: Do not raise on validator functions
- [[ESLINTJS-18](https://sonarsource.atlassian.net/browse/ESLINTJS-18)] - `no-one-iteration-loop` is obsolete, recommend eslint built-in rule instead
- [[ESLINTJS-17](https://sonarsource.atlassian.net/browse/ESLINTJS-17)] - Allow function names for `prefer-immediate-return`

## 2025-06-26, Version 3.0.4

- [[ESLINTJS-74](https://sonarsource.atlassian.net/browse/ESLINTJS-74)] - ESLint plugin depends on `lodash.merge`

## 2025-06-17, Version 3.0.3

- [[JS-707](https://sonarsource.atlassian.net/browse/JS-707)] - S2068 should be case-insensitive and support "passphrase"
- [[JS-705](https://sonarsource.atlassian.net/browse/JS-705)] - S2699: On Typescript visit identify testing frameworks assertions
- [[JS-634](https://sonarsource.atlassian.net/browse/JS-634)] - Fix FP S6845 (`no-noninteractive-tabindex`): add recommended option to allow for `tabpanel` role
- [[JS-633](https://sonarsource.atlassian.net/browse/JS-633)] - Fix FP S3735 (`void-use`): detect correctly when used in front of promise calls
- [[JS-632](https://sonarsource.atlassian.net/browse/JS-632)] - Fix FP S6848 (`no-static-element-interactions`): add exceptions for <a> and <summary>
- [[JS-628](https://sonarsource.atlassian.net/browse/JS-628)] - Fix FP S2699 (`assertions-in-tests`): handle re-exports of assertions
- [[JS-625](https://sonarsource.atlassian.net/browse/JS-625)] - Fix FP S1848 (`constructor-for-side-effects`): Add exceptions for infrastructure-as-code constructors
- [[JS-33](https://sonarsource.atlassian.net/browse/JS-33)] - Fix FN S4123 (`no-invalid-await`): Remove in favor of `@typescript-eslint/await-thenable`

## 2025-02-13, Version 3.0.2

- [[ESLINTJS-70](https://sonarsource.atlassian.net/browse/ESLINTJS-70)] - Adapt ESLint plugin to new ESLint 9 types
- [[ESLINTJS-60](https://sonarsource.atlassian.net/browse/ESLINTJS-60)] - Use context.parser instead of Babel for rule S125

## 2024-12-05, Version 3.0.1

- [[ESLINTJS-64](https://sonarsource.atlassian.net/browse/ESLINTJS-64)] - Fix `Usage` section of the documentation
- [[ESLINTJS-61](https://sonarsource.atlassian.net/browse/ESLINTJS-61)] - Allow for wider margin of Typescript versions
- [[ESLINTJS-55](https://sonarsource.atlassian.net/browse/ESLINTJS-55)] - Create solution for release notes

## 2024-12-02, Version 3.0.0

- [[JS-359](https://sonarsource.atlassian.net/browse/JS-359)] - Create rule S6418 (`no-hardcoded-secrets`): Hard-coded secrets are security-sensitive

* [[ESLINTJS-65](https://sonarsource.atlassian.net/browse/ESLINTJS-65)] - Remove decorated rules from ESLint plugin
* [[ESLINTJS-58](https://sonarsource.atlassian.net/browse/ESLINTJS-58)] - Change homepage to point to README.md in rules folder
* [[ESLINTJS-57](https://sonarsource.atlassian.net/browse/ESLINTJS-57)] - Remove "sonar-" from eslint-plugin-sonarjs rule names

## 2024-10-18, Version 2.0.4

- [[ESLINTJS-62](https://sonarsource.atlassian.net/browse/ESLINTJS-62)] - Improve S3776: Do not increase complexity on short-circuiting and null coalescing

## 2024-09-23, Version 2.0.3

- [[ESLINTJS-56](https://sonarsource.atlassian.net/browse/ESLINTJS-56)] - Improve the performances of package manifest search
- [[ESLINTJS-53](https://sonarsource.atlassian.net/browse/ESLINTJS-53)] - Support ESLint 9
- [[ESLINTJS-50](https://sonarsource.atlassian.net/browse/ESLINTJS-50)] - "sonarjs/prefer-enum-initializers" fails with newer versions of typescript-eslint
- [[ESLINTJS-49](https://sonarsource.atlassian.net/browse/ESLINTJS-49)] - Rule `no-implicit-dependencies` doesn't work

## 2024-08-30, Version 2.0.2

- [[ESLINTJS-52](https://sonarsource.atlassian.net/browse/ESLINTJS-52)] - Argument of type 'Config' is not assignable to parameter of type 'ConfigWithExtends'
- [[ESLINTJS-51](https://sonarsource.atlassian.net/browse/ESLINTJS-51)] - The public APIs wrongly expose the internal helpers

## 2024-08-23, Version 2.0.1

- [[ESLINTJS-48](https://sonarsource.atlassian.net/browse/ESLINTJS-48)] - Add all the missing declared dependencies that prevent the plugin to be installed using yarn + pnpm
- [[ESLINTJS-47](https://sonarsource.atlassian.net/browse/ESLINTJS-47)] - `jsx-ast-utils` is missing from the list of dependencies of the package
- [[ESLINTJS-46](https://sonarsource.atlassian.net/browse/ESLINTJS-46)] - The plugin emits a warning when used with ESLint 8

## 2024-08-22, Version 2.0.0

- [[JS-194](https://sonarsource.atlassian.net/browse/JS-194)] - Provide eslint configurations based on Sonar way profile
- [[JS-191](https://sonarsource.atlassian.net/browse/JS-191)] - Expose all rules from SonarJS
