/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
type Default = string | boolean | number | string[] | number[] | Object;

type ESLintConfigurationDefaultProperty = {
  default: Default;
};

/**
 * Necessary for the property to show up in the SonarQube interface.
 * @param description will explain to the user what the property configures
 * @param displayName only necessary if the name of the property is different from the `field` name
 * @param customDefault only necessary if different default in SQ different than in JS/TS
 * @param items only necessary if type is 'array'
 * @param fieldType only necessary if you need to override the default fieldType in SQ
 * @param customForConfiguration replacement content how to pass this variable to the Configuration object
 */
export type ESLintConfigurationSQProperty = ESLintConfigurationDefaultProperty & {
  description: string;
  displayName?: string;
  customDefault?: Default;
  items?: {
    type: 'string' | 'integer';
  };
  fieldType?: 'TEXT';
  customForConfiguration?: (value: unknown) => unknown;
};

export type ESLintConfigurationProperty =
  | ESLintConfigurationDefaultProperty
  | ESLintConfigurationSQProperty;

type ESLintConfigurationNamedProperty = ESLintConfigurationProperty & {
  field: string;
};

type ESLintConfigurationElement = ESLintConfigurationNamedProperty[] | ESLintConfigurationProperty;

export type ESLintConfiguration = ESLintConfigurationElement[];

export function defaultOptions(configuration?: ESLintConfiguration) {
  return configuration?.map(element => {
    if (Array.isArray(element)) {
      return Object.fromEntries(
        element.map(namedProperty => [namedProperty.field, namedProperty.default]),
      );
    } else {
      return element.default;
    }
  });
}

/**
 * Applies `customForConfiguration` transformations to merged configuration values.
 *
 * When SonarQube sends rule parameters, the values may not match what the underlying
 * ESLint rule expects. For example, S1441 (quotes) exposes a boolean `singleQuotes`
 * property in SonarQube, but the ESLint rule expects the string `"single"` or `"double"`.
 * The `customForConfiguration` function on a field definition bridges this gap.
 *
 * This function walks the `mergedValues` array (the result of merging default options
 * with user-provided configurations) and applies any `customForConfiguration` transform
 * found in the corresponding `fields` element. It handles both configuration patterns:
 *
 * - **Primitive elements** (e.g., S1441's boolean → string mapping): the transform is
 *   called directly on the merged value.
 * - **Object elements** (e.g., S6418's `randomnessSensibility` string → number): each
 *   named property within the object is checked individually, and only properties that
 *   define `customForConfiguration` are transformed.
 *
 * Values without a corresponding field definition or without `customForConfiguration`
 * are passed through unchanged.
 *
 * @param fields - The rule's field definitions from its `config.ts` (may contain transforms)
 * @param mergedValues - The merged configuration array (defaults + user overrides)
 * @returns A new array with transformed values ready to pass to the ESLint rule
 *
 * @example
 * // S1441: primitive transform (boolean → string)
 * // fields[0] has customForConfiguration: (v) => v ? 'single' : 'double'
 * applyTransformations(fields, [true, {avoidEscape: true}])
 * // → ['single', {avoidEscape: true}]
 *
 * @example
 * // S6418: object property transform (string → number)
 * // fields[0][1] has customForConfiguration: (v) => Number(v)
 * applyTransformations(fields, [{secretWords: 'api_key', randomnessSensibility: '5.0'}])
 * // → [{secretWords: 'api_key', randomnessSensibility: 5}]
 */
export function applyTransformations(
  fields: ESLintConfiguration | undefined,
  mergedValues: unknown[] | undefined,
): unknown[] {
  if (!fields || !mergedValues) {
    return mergedValues ?? [];
  }
  // Walk mergedValues in parallel with fields. Each position in the array
  // corresponds to one element in the rule's config.ts `fields` definition.
  // For example, S1441 fields = [primitive, object]:
  //   mergedValues[0] = true          → fields[0] = { default: 'single', customForConfiguration: ... }
  //   mergedValues[1] = {avoidEscape} → fields[1] = [{field: 'avoidEscape', ...}, ...]
  return mergedValues.map((mergedConfigEntry, index) => {
    // Extra values beyond what fields defines (shouldn't happen, but safe to pass through)
    if (index >= fields.length) {
      return mergedConfigEntry;
    }
    const fieldDefinition = fields[index];

    if (Array.isArray(fieldDefinition)) {
      // ── Object config element ──
      // fieldDefinition is an array of named properties: [{field, default, ...}, ...]
      // mergedConfigEntry is an object: { fieldName: value, ... }
      //
      // Example — S6418 fields = [[ {field: 'secretWords', ...}, {field: 'randomnessSensibility', customForConfiguration: (v) => Number(v)} ]]
      // mergedConfigEntry = { secretWords: 'api_key', randomnessSensibility: '5.0' }
      // After transform: { secretWords: 'api_key', randomnessSensibility: 5 }
      if (
        mergedConfigEntry &&
        typeof mergedConfigEntry === 'object' &&
        !Array.isArray(mergedConfigEntry)
      ) {
        const transformedEntry = { ...mergedConfigEntry } as Record<string, unknown>;
        for (const propertyDef of fieldDefinition) {
          // Only transform properties that define customForConfiguration and are present in the object
          if (
            'customForConfiguration' in propertyDef &&
            typeof propertyDef.customForConfiguration === 'function' &&
            propertyDef.field in transformedEntry
          ) {
            transformedEntry[propertyDef.field] = propertyDef.customForConfiguration(
              transformedEntry[propertyDef.field],
            );
          }
        }
        return transformedEntry;
      }
    } else if (
      'customForConfiguration' in fieldDefinition &&
      typeof fieldDefinition.customForConfiguration === 'function'
    ) {
      // ── Primitive config element with a transform ──
      // fieldDefinition is a single property: { default, customForConfiguration, ... }
      // mergedConfigEntry is a scalar value (string, number, boolean)
      //
      // Example — S1441 fieldDefinition = { default: 'single', customDefault: true, customForConfiguration: (v) => v ? 'single' : 'double' }
      // mergedConfigEntry = true (boolean from SQ)
      // After transform: 'single' (string expected by ESLint quotes rule)
      return fieldDefinition.customForConfiguration(mergedConfigEntry);
    }

    // No transform defined for this element — pass through unchanged.
    // This is the common case for most rules (e.g., S134 threshold, S100 format pattern).
    return mergedConfigEntry;
  });
}
