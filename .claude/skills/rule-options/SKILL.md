---
name: rule-options
description: Add or modify rule options in SonarJS, including the fields array, SonarQube UI visibility, and Java check class configuration. Use when working on rule configurations.
---

## Architecture Overview

Rule options flow through one typed path:

```
SonarQube UI → Java Check Class → configurations() → AnalyzeProjectRequest → normalizeJsTsRules() → ESLint Linter
```

The Java bridge encodes rule configurations as protobuf `Value` messages. Node.js receives numbers,
booleans, strings, arrays, and objects with their types preserved.

## Key Files per Rule

| File                | Purpose                                                     |
| ------------------- | ----------------------------------------------------------- |
| `rule.ts`           | ESLint rule implementation                                  |
| `meta.ts`           | `implementation`, `eslintId`, `schema`, re-exports `fields` |
| `config.ts`         | `fields` array — source of truth for options                |
| `generated-meta.ts` | Auto-generated `defaultOptions` — do not edit               |

## The `fields` Array (`config.ts`)

The `fields` array defines options for SonarQube integration and default values.

```typescript
import type { ESLintConfiguration } from '../helpers/configs.js';

export const fields = [
  [
    // outer array = one ESLint options object
    {
      field: 'max', // ESLint option name
      displayName: 'maximumFunctionParameters', // SonarQube key (if different)
      description: 'Maximum authorized...', // REQUIRED for SQ visibility
      default: 7, // default value; determines type
    },
    {
      field: 'ignoreIIFE',
      default: false, // no description = internal only
    },
  ],
] as const satisfies ESLintConfiguration;
```

### Field Properties

| Property        | Required              | Purpose                                                                    |
| --------------- | --------------------- | -------------------------------------------------------------------------- |
| `field`         | Yes                   | ESLint/schema key name                                                     |
| `default`       | Yes                   | Default value; also determines type (`number`, `string`, `boolean`, array) |
| `description`   | **For SQ visibility** | Makes option visible in SonarQube UI                                       |
| `displayName`   | No                    | SonarQube key if different from `field`                                    |
| `items`         | For arrays            | `{ type: 'string' }` or `{ type: 'integer' }`                              |
| `customDefault` | No                    | Different default for SQ than ESLint                                       |
| `fieldType`     | No                    | Override SQ field type (e.g., `'TEXT'`)                                    |

## Making Options Visible in SonarQube

**A field appears in the SonarQube UI only if it has a `description`.**

Fields without `description` are internal defaults invisible to users.

```typescript
// S109/config.ts — NOT visible in SQ (no descriptions)
export const fields = [
  [
    { field: 'ignore', default: [0, 1, -1, 24, 60] },
    { field: 'ignoreDefaultValues', default: true },
  ],
] as const satisfies ESLintConfiguration;

// S2068/config.ts — VISIBLE in SQ (has description)
export const fields = [
  [
    {
      field: 'passwordWords',
      items: { type: 'string' },
      description: 'Comma separated list of words identifying potential passwords.',
      default: ['password', 'pwd', 'passwd', 'passphrase'],
    },
  ],
] as const satisfies ESLintConfiguration;
```

## Configuration Shapes

### Object-style (most common)

```typescript
export const fields = [
  [
    { field: 'max', description: '...', default: 7 },
    { field: 'ignoreIIFE', description: '...', default: false },
  ],
] as const satisfies ESLintConfiguration;
// ESLint receives: [{ max: 7, ignoreIIFE: false }]
```

### Primitive (single value)

```typescript
export const fields = [{ default: '^[a-z]+$' }] as const satisfies ESLintConfiguration;
// ESLint receives: ['^[a-z]+$']
```

### Array options (comma-separated in SQ)

```typescript
export const fields = [
  [
    {
      field: 'passwordWords',
      items: { type: 'string' }, // required for Java codegen
      description: 'Comma separated list...',
      default: ['password', 'pwd'],
    },
  ],
] as const satisfies ESLintConfiguration;
// SQ sends: "password,pwd,secret" → ESLint: [{ passwordWords: ['password','pwd','secret'] }]
```

## Typed gRPC Values

The gRPC normalizer does not parse rule options from strings. The generated Java check converts
SonarQube parameters to their runtime types before building the protobuf request. In particular,
array parameters entered as comma-separated text in SonarQube are split and trimmed on the Java
side, then received by Node.js as protobuf lists.

See `docs/rule-configuration-patterns.md` for the supported option shapes and materialization
rules.

## JSON Schema vs `fields`

| Aspect       | JSON Schema (`meta.ts`)       | `fields` (`config.ts`)                |
| ------------ | ----------------------------- | ------------------------------------- |
| Purpose      | ESLint validation             | SQ UI + defaults + key mapping        |
| Used by      | ESLint at runtime             | Java codegen, meta generation, linter |
| Required for | `original` rules with options | All rules with options                |

For `original` rules, schema and fields must be kept in sync manually.
For `decorated`/`external` rules, schema is inherited from the external rule.

## Adding Options to an Existing Rule

1. Update `config.ts` — add field to `fields` array
2. Add `description` if it should be visible in SonarQube
3. Update `meta.ts` schema (for `original`/`decorated` rules)
4. Run `npm run generate-meta` — updates `generated-meta.ts` with new `defaultOptions`
5. Run `npm run generate-java-rule-classes` — updates Java check classes
6. Verify Java class has correct `configurations()` method

## Java Check Class (`configurations()`)

```java
// Example: S107Check.java
@Override
public List<Object> configurations() {
  return List.of(Map.of("max", maximum));
}

@RuleProperty(
  key = "maximumFunctionParameters",
  description = "Maximum authorized number of parameters",
  defaultValue = "" + DEFAULT_MAX
)
private int maximum = DEFAULT_MAX;
```

Use `MyRuleCheckTest.java` to verify serialization:

```java
assertThat(new MyRuleCheck().configurations()).containsExactly(Map.of("max", 7));
```

## Key Mapping: SonarQube ↔ ESLint

When SQ and ESLint use different names:

```typescript
// config.ts
{ field: 'max', displayName: 'maximumFunctionParameters', ... }
```

`displayName` controls the generated SonarQube parameter key, while `field` remains the key in the
materialized ESLint option. The generated Java check sends the typed ESLint-shaped configuration,
which Node.js merges with the rule defaults.
