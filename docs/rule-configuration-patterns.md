# Rule Configuration Patterns

This document describes how JavaScript, TypeScript, and CSS rules declare options in SonarJS and
how those declarations become analyzer configurations at runtime.

The source definitions serve two purposes:

- describe the option shape and defaults expected by ESLint or Stylelint in Node.js,
- generate the Java check fields that SonarQube exposes as rule parameters.

The supported runtime path uses the typed `AnalyzeProjectService` contract. Rule configurations
are created by the Java checks, serialized as protobuf `Value` messages, and normalized without
string-based type inference in Node.js.

## Runtime Flow

```text
config.ts / css/rules/metadata.ts
  -> tools/generate-java-rule-classes.ts
  -> generated Java @RuleProperty fields and configurations()
  -> EslintRule / StylelintRule
  -> AnalyzeProjectMessages.toProtoRule()
  -> AnalyzeProjectService protobuf Value messages
  -> normalizeJsTsRules() / normalizeCssRules()
  -> ESLint / Stylelint configuration
```

JavaScript and TypeScript defaults are merged in Node.js by `materializeRuleOptions()`. CSS
options are fully constructed by the generated Java checks before crossing the gRPC boundary.

## JavaScript and TypeScript Patterns

JavaScript and TypeScript rules define `fields` in their `config.ts` file using the
`ESLintConfiguration` type from `packages/analysis/src/jsts/rules/helpers/configs.ts`.

Each top-level array position corresponds to one ESLint option. A top-level property represents a
primitive option, while an array of named properties represents one object option.

### Named object option

This is the most common pattern. One or more named properties form an ESLint object option.

**Structure:** `[[{ field, default, ... }]]`

**Materialized ESLint option:** `[{ field: value }]`

Example from S100:

```typescript
export const fields = [
  [
    {
      field: 'format',
      description: 'Regular expression used to check the function names against.',
      default: '^[_a-z][a-zA-Z0-9]*$',
    },
  ],
] as const satisfies ESLintConfiguration;
```

The generated Java check exposes `format` because the property has a `description`. Its value is
sent as a map entry, then merged with the complete object defaults in Node.js.

### Primitive default

A primitive property without a `description` contributes an analyzer default but is not exposed
as a SonarQube rule parameter.

**Structure:** `[{ default: value }]`

**Materialized ESLint option:** `[value]`

Example from S1440:

```typescript
export const fields = [
  {
    default: 'smart',
  },
] as const satisfies ESLintConfiguration;
```

No Java `@RuleProperty` or runtime override is generated for this entry. The value is materialized
from the Node-side metadata.

### Configurable primitive

A primitive property with a `description` is exposed to SonarQube. `displayName` specifies its
SonarQube parameter key because primitive entries have no `field` name of their own.

**Structure:** `[{ default, description, displayName }]`

**Materialized ESLint option:** `[value]`

Example from S3776:

```typescript
export const fields = [
  {
    default: 15,
    displayName: 'threshold',
    description: 'The maximum authorized complexity.',
  },
] as const satisfies ESLintConfiguration;
```

The generated Java field is named `value`, the SonarQube parameter is named `threshold`, and the
typed number is sent to Node.js.

### Mixed primitive and object options

A rule can combine primitive and object positions in the order expected by ESLint.

**Structure:** `[{ default, ... }, [{ field, default, ... }]]`

**Materialized ESLint options:** `[value, { field: value }]`

Example from S1105:

```typescript
export const fields = [
  {
    default: '1tbs',
    description: 'enforced brace-style: 1tbs, stroustrup or allman.',
    displayName: 'braceStyle',
  },
  [
    {
      field: 'allowSingleLine',
      default: true,
    },
  ],
] as const satisfies ESLintConfiguration;
```

Here `braceStyle` is configurable in SonarQube. `allowSingleLine` has no `description`, so it
remains an internal default. Node.js merges the incoming primitive with the object default to
produce `['1tbs', { allowSingleLine: true }]`.

### Property metadata

| Property                 | Purpose                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `default`                | Value and type expected by the Node rule                                                     |
| `field`                  | Property name inside an ESLint object option                                                 |
| `description`            | Marks the property as user-configurable and supplies the SonarQube description               |
| `displayName`            | Overrides the SonarQube parameter key without changing the ESLint field name                 |
| `customDefault`          | Uses a different default for the generated SonarQube property                                |
| `items`                  | Declares array item type so Java generation can convert the comma-separated UI value         |
| `fieldType`              | Overrides the generated SonarQube field type                                                 |
| `customForConfiguration` | Converts a merged value into the exact representation expected by the underlying ESLint rule |

A property is exposed to SonarQube only when it has a `description`. `displayName` is therefore
not a general rename: it controls the external SonarQube key, while `field` remains the key inside
the ESLint object.

### Defaults, overrides, and transformations

`materializeRuleOptions()` merges three sources in order:

1. the underlying ESLint rule's `meta.defaultOptions`,
2. the defaults declared by SonarJS `fields`,
3. the typed configurations received from Java.

Later values override earlier ones. Object options are merged recursively, while arrays replace
the previous array value. After merging, `customForConfiguration` functions are applied.

For example, S1441 exposes the SonarQube property `singleQuotes`, while ESLint expects the strings
`'single'` or `'double'`. Its `customForConfiguration` converts the incoming representation after
defaults and overrides have been merged.

Array parameters are entered as comma-separated text in SonarQube. The generated Java check
splits and trims that field into a typed array before creating the protobuf request. The Node gRPC
boundary receives a protobuf list; it does not parse a comma-separated string.

## CSS Patterns

CSS rule bindings and parameters are declared in
`packages/analysis/src/css/rules/metadata.ts`. `tools/generate-java-rule-classes.ts` turns this
metadata into Java `CssRule` implementations. The resulting `StylelintRule` configurations cross
the gRPC boundary as typed protobuf values.

### No parameters

A simple binding only supplies the SonarQube rule key and Stylelint rule key:

```typescript
simpleRule('S4658', 'block-no-empty');
```

The generated Java check returns an empty configuration list. In Node.js,
`createStylelintConfig()` converts an empty list to `true`, enabling the Stylelint rule with its
defaults.

### List parameter

`StylelintListParam` describes a comma-separated SonarQube property that becomes a string array in
a Stylelint secondary-options object.

```typescript
type StylelintListParam = {
  sqKey: string;
  javaField: string;
  description: string;
  default: string;
  stylelintOptionKey: string;
};
```

Example from S4662:

```typescript
ignoreAtRulesRule(
  'S4662',
  'at-rule-no-unknown',
  'ignoreAtRules',
  'Comma-separated list of "at-rules" to consider as valid.',
  supportedCssToolDirectives.join(','),
);
```

If the SonarQube value is `tailwind,apply`, the generated Java check emits the typed configuration
`[true, { ignoreAtRules: ['tailwind', 'apply'] }]`.

`multiListParamRule()` combines multiple list properties into the same secondary-options object.
S4654, for example, supplies both `ignoreProperties` and `ignoreSelectors` to
`property-no-unknown`.

### Boolean parameter

`StylelintBooleanParam` conditionally supplies a fixed secondary-options object:

```typescript
type StylelintBooleanParam = {
  sqKey: string;
  javaField: string;
  description: string;
  default: boolean;
  onTrue: Array<{
    stylelintOptionKey: string;
    values: string[];
  }>;
};
```

S4656 uses `ignoreFallbacks`. When it is `true`, Java emits:

```typescript
[true, { ignore: ['consecutive-duplicates-with-different-values'] }];
```

When it is `false`, Java emits an empty configuration list, which keeps the rule enabled with its
default Stylelint behavior.

### Multiple Stylelint bindings

One SonarQube rule can map to several Stylelint rules. Multiple `CssRuleMeta` entries use the same
`sqKey`, each with its own `stylelintKey` and parameter metadata.

S1874 currently binds to:

- `selector-no-deprecated`, with `ignoreSelectors`,
- `declaration-property-value-keyword-no-deprecated`, with `ignoreKeywords`,
- `at-rule-no-deprecated`, with `ignoreAtRules`.

The generated Java check overrides `stylelintRules()` and returns one `StylelintRule` per binding.
Each binding is serialized as a separate `CssRule` in the analyze-project request. The reverse map
in `metadata.ts` maps each Stylelint key back to the shared SonarQube rule key for issue reporting.

## Adding or Changing a Rule Option

For JavaScript and TypeScript rules:

1. Update the rule's `config.ts` using the option positions expected by ESLint.
2. Add `description` only for values that users should configure in SonarQube.
3. Use `displayName` when the SonarQube key must differ from the ESLint field name.
4. Use `items`, `customDefault`, or `customForConfiguration` when the UI representation differs
   from the rule's runtime representation.
5. Run `npm run generate-meta` to update the Node rule metadata.
6. Run `npm run generate-java-rule-classes` to update the generated Java checks.
7. Add or update tests for defaults, overrides, and any custom transformation.

For CSS rules:

1. Add or update the binding in `packages/analysis/src/css/rules/metadata.ts`.
2. Select a simple, list, boolean, or multi-binding pattern.
3. Regenerate the Java checks and generated tests with `npm run generate-java-rule-classes`.
4. Verify both the generated Java configuration and the resulting Stylelint configuration.

Do not add string parsing to the gRPC request normalizer. The current contract intentionally keeps
configuration values typed from the generated Java check through Node.js.

## Relevant Files

| Area                    | File                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| JS/TS option types      | `packages/analysis/src/jsts/rules/helpers/configs.ts`                                               |
| JS/TS option examples   | `packages/analysis/src/jsts/rules/*/config.ts`                                                      |
| JS/TS option merging    | `packages/analysis/src/jsts/rules/helpers/configs.ts`                                               |
| CSS binding metadata    | `packages/analysis/src/css/rules/metadata.ts`                                                       |
| Java check generation   | `tools/generate-java-rule-classes.ts`                                                               |
| Java protobuf encoding  | `sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/bridge/AnalyzeProjectMessages.java` |
| Node request conversion | `packages/grpc/src/analyze-project-normalize.ts`                                                    |
| Stylelint activation    | `packages/analysis/src/css/linter/config.ts`                                                        |
