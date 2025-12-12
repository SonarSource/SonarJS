# Rule Configuration Patterns

This document describes the different configuration patterns used by ESLint rules in SonarJS and how they are handled by the gRPC transformer in `transformers.ts`.

## Overview

ESLint rules can have configurable parameters. In SonarJS, these are defined in each rule's `config.ts` file using the `ESLintConfiguration` type. The gRPC transformer (`buildConfigurations` function) converts SonarQube parameter values into ESLint configuration arrays.

## Configuration Patterns

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

## Value Parsing

The `parseParamValue` function converts string param values to the appropriate type:

- **Numbers:** If default is a number, parse as float
- **Booleans:** If default is boolean, compare with 'true'
- **Arrays:** If default is an array, split by comma
- **Strings:** Otherwise, keep as string
