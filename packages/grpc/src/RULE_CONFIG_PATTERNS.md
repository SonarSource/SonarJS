# Rule Configuration Patterns

This document describes the different configuration patterns used by JS/TS and CSS rules in SonarJS and how they are handled by the gRPC transformers in `transformers/rule-configurations/`.

## Overview

Rules can have configurable parameters. JS/TS rules define theirs in each rule's `config.ts` using the `ESLintConfiguration` type. CSS rules define theirs in `packages/css/src/rules/metadata.ts` using `ignoreParams` and `booleanParam` metadata.

The gRPC transformers in `rule-configurations/jsts.ts` and `rule-configurations/css.ts` convert SonarQube parameter string values into the configuration arrays expected by ESLint and stylelint respectively.

## JS/TS Configuration Patterns

### Type A: Single Object Config `[[{field,...}]]`

The most common pattern. A single object with one or more named fields.

**Structure:** `[[{field: 'name', default: value, displayName?: 'sqKey'}]]`

**ESLint output:** `[{ name: value }]`

**Example (S100):**

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

**SQ Param:** `format` (or `displayName` if specified)

**Rules using this pattern:** S100, S101, S103, S104, S106, S107, S108, S109, S1067, S1117, S117, S1186, S1192, S124, S134, S138, S139, S1451, S1541, S2004, S2068, S2094, S2376, S2430, S2814, S2999, S3353, S3524, S4023, S4137, S4275, S4327, S4328, S4622, S5604, S5693, S5843, S6418, S6480, S6544, S6550, S6606, S6644, S6671, S6747, S6749, S6754, S6766, S6791, S6821, S6845, S6847, S7718, S7721, S7749, S905 (55 rules)

---

### Type B: Single Primitive Config `[{default}]`

A single primitive value without an SQ parameter key.

**Structure:** `[{default: value}]`

**ESLint output:** `[value]`

**Example (S1440):**

```typescript
export const fields = [
  {
    default: 'smart',
  },
] as const satisfies ESLintConfiguration;
```

**SQ Param:** None - uses first param value as fallback

**Rules using this pattern:** S113, S1440, S1539, S3723, S4144 (5 rules)

---

### Type C: Single Primitive with displayName `[{default, displayName}]`

A single primitive value with an SQ parameter key.

**Structure:** `[{default: value, displayName: 'sqKey'}]`

**ESLint output:** `[value]`

**Example (S3776):**

```typescript
export const fields = [
  {
    default: 15,
    displayName: 'threshold',
    description: 'The maximum authorized complexity.',
  },
] as const satisfies ESLintConfiguration;
```

**SQ Param:** `threshold`

**Rules using this pattern:** S1479, S3776 (2 rules)

---

### Type D: Mixed Primitive + Object `[{default, displayName}, [{field},...]]`

A combination of primitive and object configurations.

**Structure:** `[{default: value, displayName: 'sqKey'}, [{field: 'name', default: value}]]`

**ESLint output:** `[value, { name: value }]`

**Example (S1105):**

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

**SQ Params:** `braceStyle`, `allowSingleLine`

**Rules using this pattern:** S1105, S1441 (2 rules)

---

## Summary Table

| Pattern | Count | Description                            | Example                                                    |
| ------- | ----- | -------------------------------------- | ---------------------------------------------------------- |
| Type A  | 55    | Single object config with named fields | `[[{field:'format'}]]`                                     |
| Type B  | 5     | Single primitive without SQ key        | `[{default:'smart'}]`                                      |
| Type C  | 2     | Single primitive with SQ key           | `[{default:15,displayName:'threshold'}]`                   |
| Type D  | 2     | Mixed primitive + object               | `[{displayName:'braceStyle'},[{field:'allowSingleLine'}]]` |

**Total: 65 rules with configurable parameters**

## How Parameters are Matched

1. **Object fields (`[{field, displayName?}]`):** SQ key is `displayName` if present, otherwise `field`
2. **Primitive with displayName:** SQ key is `displayName`
3. **Primitive without displayName:** Falls back to using the first param value (only at index 0)

## JS/TS Value Parsing

The `parseParamValue` function in `rule-configurations/jsts.ts` converts string param values to the appropriate type:

- **Numbers:** If default is a number, parse as float
- **Booleans:** If default is boolean, compare with 'true'
- **Arrays:** If default is an array, split by comma
- **Strings:** Otherwise, keep as string

---

## CSS Configuration Patterns

CSS rules use stylelint, which expects rule configurations in the format `[primaryOption, secondaryOptions]` where the primary option is `true` (to enable the rule) and secondary options is an object with rule-specific settings.

CSS rule parameters are defined declaratively in `packages/css/src/rules/metadata.ts` using two patterns. The gRPC transformer in `rule-configurations/css.ts` reads these definitions and builds the stylelint configuration arrays.

### Ignore Params (string-list)

The most common CSS parameter pattern. One or more comma-separated string lists that map to stylelint secondary option keys.

**Metadata structure:**

```typescript
ignoreParams: [{
  sqKey: string;              // SonarQube parameter key (used in gRPC requests)
  javaField: string;          // Java field name (used in generated Java classes)
  description: string;        // Parameter description
  default: string;            // Default comma-separated values
  stylelintOptionKey: string; // Key in stylelint's secondary options object
}]
```

**Stylelint output:** `[true, { stylelintOptionKey: ['value1', 'value2', ...] }]`

**Example (S4662 — at-rule-no-unknown):**

```typescript
{
  sqKey: 'S4662',
  stylelintKey: 'at-rule-no-unknown',
  ignoreParams: [{
    sqKey: 'ignoreAtRules',
    javaField: 'ignoredAtRules',
    description: 'Comma-separated list of "at-rules" to consider as valid.',
    default: 'value,at-root,content,...,/^@.*/',
    stylelintOptionKey: 'ignoreAtRules',
  }],
}
```

**SQ Param:** `ignoreAtRules=tailwind,apply`
**Stylelint config:** `[true, { ignoreAtRules: ['tailwind', 'apply'] }]`

Some rules have multiple ignore params (e.g., S4654 has `ignoreProperties` and `ignoreSelectors`), which are merged into a single secondary options object.

**Rules using this pattern:** S4649, S4653, S4654, S4659, S4660, S4662, S4670 (7 rules)

---

### Boolean Param (conditional options)

A boolean parameter that conditionally enables a fixed set of stylelint options.

**Metadata structure:**

```typescript
booleanParam: {
  sqKey: string;              // SonarQube parameter key
  javaField: string;          // Java field name
  description: string;        // Parameter description
  default: boolean;           // Default value
  onTrue: [{                  // Options to set when the boolean is true
    stylelintOptionKey: string;
    values: string[];
  }]
}
```

**Stylelint output (when true):** `[true, { stylelintOptionKey: ['value1', ...] }]`
**Stylelint output (when false):** `[]` (rule enabled with defaults only)

**Example (S4656 — declaration-block-no-duplicate-properties):**

```typescript
{
  sqKey: 'S4656',
  stylelintKey: 'declaration-block-no-duplicate-properties',
  booleanParam: {
    sqKey: 'ignoreFallbacks',
    javaField: 'ignoreFallbacks',
    description: 'Ignore consecutive duplicated properties with different values.',
    default: true,
    onTrue: [{
      stylelintOptionKey: 'ignore',
      values: ['consecutive-duplicates-with-different-values'],
    }],
  },
}
```

**SQ Param:** `ignoreFallbacks=true`
**Stylelint config:** `[true, { ignore: ['consecutive-duplicates-with-different-values'] }]`

**Rules using this pattern:** S4656 (1 rule)

---

### No Params

Rules without `ignoreParams` or `booleanParam` have no configurable parameters. They are enabled with `true` as the sole configuration.

**Stylelint output:** `true`

**Rules using this pattern:** S125, S1116, S1128, S4647, S4648, S4650, S4651, S4652, S4655, S4657, S4658, S4661, S4663, S4664, S4666, S4667, S4668, S5362, S7923, S7924, S7925 (21 rules)

---

## CSS Summary Table

| Pattern       | Count | Description                  | Stylelint Output                 |
| ------------- | ----- | ---------------------------- | -------------------------------- |
| No params     | 21    | Rule enabled with defaults   | `true`                           |
| Ignore params | 7     | Comma-separated string lists | `[true, { key: ['v1', 'v2'] }]`  |
| Boolean param | 1     | Conditional fixed options    | `[true, { key: ['v'] }]` or `[]` |

**Total: 29 CSS rules (8 with configurable parameters)**
