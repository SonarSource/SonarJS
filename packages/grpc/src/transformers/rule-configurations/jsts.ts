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
import type { analyzer } from '../../proto/language_analyzer.js';
import { debug } from '../../../../shared/src/helpers/logging.js';
import { isString } from '../../../../shared/src/helpers/sanitize.js';
import type { ESLintConfiguration } from '../../../../jsts/src/rules/helpers/configs.js';
import type { RuleConfig } from '../../../../jsts/src/linter/config/rule-config.js';
import type { FileType } from '../../../../shared/src/helpers/files.js';
import * as metas from '../../../../jsts/src/rules/metas.js';

/**
 * Metadata for a SonarQube rule, extracted from the rule's meta.ts file.
 *
 * @property sonarKey - The SonarQube rule key (e.g., 'S100', 'S107')
 * @property scope - Whether the rule applies to 'Main' source files or 'Tests'
 * @property languages - Which languages the rule supports ('js', 'ts', or both)
 * @property fields - Optional ESLint configuration schema defining the rule's parameters
 *
 * @see RULE_CONFIG_PATTERNS.md for details on how fields are structured
 */
type RuleMeta = {
  sonarKey: string;
  scope: 'Main' | 'Tests';
  languages: ('js' | 'ts')[];
  fields?: ESLintConfiguration;
};

/**
 * A field definition from a rule's config.ts file, representing a single
 * configurable parameter within an object configuration.
 *
 * Used in Type A (single object config) and Type D (mixed) configuration patterns.
 *
 * @property field - The ESLint config property name (used in the output config object)
 * @property displayName - Optional SonarQube parameter key. If omitted, `field` is used as the SQ key
 * @property default - The default value, also used to determine the type for parsing
 */
type FieldDef = {
  field: string;
  displayName?: string;
  default: unknown;
};

/**
 * Lookup map from SonarQube rule key (e.g., 'S100', 'S107') to rule metadata.
 *
 * This map is built at module load time by iterating over all exported rule
 * metadata from `packages/jsts/src/rules/metas.js`. Each rule's `meta.ts` file
 * exports a `sonarKey` which is used as the map key.
 *
 * @see docs/DEV.md "Rule Options Architecture" section for how rules are structured
 */
const ruleMetaMap: Map<string, RuleMeta> = new Map();
for (const [, ruleMeta] of Object.entries(metas)) {
  const meta = ruleMeta as RuleMeta;
  if (meta.sonarKey) {
    ruleMetaMap.set(meta.sonarKey, meta);
  }
}

/**
 * Parse a string parameter value into the appropriate type based on the field's default value.
 *
 * In the gRPC workflow, all parameter values arrive as strings from external clients.
 * This function converts them to the proper type by examining the `default` value
 * from the rule's `config.ts` field definition.
 *
 * Type inference rules:
 * - If default is a `number` → parse as float, fallback to default if NaN
 * - If default is a `boolean` → compare with string 'true'
 * - If default is an `array` → split by comma, preserve element type from default[0]
 * - Otherwise → keep as string
 *
 * @param value - The string value received from the gRPC client
 * @param defaultValue - The default value from the field definition (determines target type)
 * @returns The parsed value in the appropriate type
 *
 * @example
 * parseParamValue('5', 7)           // → 5 (number)
 * parseParamValue('true', false)    // → true (boolean)
 * parseParamValue('a,b,c', ['x'])   // → ['a', 'b', 'c'] (string[])
 * parseParamValue('1,2,3', [0])     // → [1, 2, 3] (number[])
 * parseParamValue('pattern', '')    // → 'pattern' (string)
 *
 * @see docs/DEV.md "Type Parsing from Strings (gRPC only)" section
 */
function parseParamValue(value: string, defaultValue: unknown) {
  if (typeof defaultValue === 'number') {
    const num = Number(value);
    return Number.isNaN(num) ? defaultValue : num;
  }
  if (typeof defaultValue === 'boolean') {
    return value === 'true';
  }
  if (Array.isArray(defaultValue)) {
    // Split comma-separated values, preserving element type from default
    const parts = value.split(',').map(v => v.trim());
    // Check the first element of default to determine array element type
    if (defaultValue.length > 0 && typeof defaultValue[0] === 'number') {
      return parts.map(Number).filter(n => !Number.isNaN(n));
    }
    return parts;
  }
  // Default to string
  return value;
}

/**
 * Build an object configuration from an array of field definitions.
 *
 * Handles **Type A** (single object config) and the object part of **Type D** (mixed) patterns.
 * These patterns use `[[{field, default, displayName?}, ...]]` in the rule's `config.ts`.
 *
 * For each field definition:
 * 1. Determines the SonarQube parameter key (`displayName` if set, otherwise `field`)
 * 2. Looks up the value in the params received from the client
 * 3. Parses the string value to the appropriate type based on the field's default
 * 4. Stores the result using the ESLint field name (not the SQ key)
 *
 * **Note on `displayName`:** In production, only fields with `displayName` (and `description`)
 * are exposed in SonarQube UI and can be configured by users. The fallback to `field` name
 * when `displayName` is not set exists for flexibility and testing purposes, but gRPC requests
 * from SonarQube will never include parameters for fields without `displayName`.
 *
 * @param fieldDefs - Array of field definitions from the rule's config.ts
 * @param paramsLookup - Map of SQ parameter keys to string values from the gRPC request
 * @returns Object with parsed values keyed by ESLint field names, or undefined if no params matched
 *
 * @example
 * // Type A: S107 config.ts has [[{field: 'max', displayName: 'maximumFunctionParameters', default: 7}]]
 * // Client sends: { key: 'maximumFunctionParameters', value: '5' }
 * buildObjectConfiguration([{field: 'max', displayName: 'maximumFunctionParameters', default: 7}], paramsLookup)
 * // Returns: { max: 5 }
 *
 * @example
 * // Type A: S100 config.ts has [[{field: 'format', default: '^[_a-z]...'}]] (no displayName)
 * // Client sends: { key: 'format', value: '^[A-Z].*$' }
 * // Note: This fallback path is only used in tests; production requests won't have this param.
 * buildObjectConfiguration([{field: 'format', default: '^[_a-z]...'}], paramsLookup)
 * // Returns: { format: '^[A-Z].*$' }
 *
 * @see RULE_CONFIG_PATTERNS.md "Type A: Single Object Config" section
 */
function buildObjectConfiguration(fieldDefs: FieldDef[], paramsLookup: Map<string, string>) {
  const paramsObj: Record<string, ReturnType<typeof parseParamValue>> = {};

  for (const fieldDef of fieldDefs) {
    // In production, only fields with displayName are configurable in SonarQube.
    // The fallback to `field` is for testing purposes and non-SonarQube clients.
    const sqKey = fieldDef.displayName ?? fieldDef.field;
    const paramValue = paramsLookup.get(sqKey);

    if (paramValue !== undefined) {
      paramsObj[fieldDef.field] = parseParamValue(paramValue, fieldDef.default);
    }
  }

  return Object.keys(paramsObj).length > 0 ? paramsObj : undefined;
}

/**
 * Build a primitive configuration value from a non-array field element.
 *
 * Handles **Type B** (single primitive without SQ key), **Type C** (single primitive with displayName),
 * and the primitive part of **Type D** (mixed) patterns. These patterns use `[{default, displayName?}]`
 * (not wrapped in an inner array) in the rule's `config.ts`.
 *
 * Lookup strategy:
 * 1. If `displayName` is set → look up by that key in paramsLookup (production path)
 * 2. If no `displayName` AND this is index 0 AND params exist → use first param value as fallback
 *
 * **Note on `displayName`:** In production, only primitives with `displayName` are exposed in
 * SonarQube UI and can be configured by users. The fallback branch (strategy 2) exists for
 * flexibility and testing purposes, but gRPC requests from SonarQube will never trigger it
 * since Type B rules (like S1440) have no configurable parameters in the UI.
 *
 * @param element - Primitive field definition with default and optional displayName
 * @param paramsLookup - Map of SQ parameter keys to string values from the gRPC request
 * @param params - Original params array (needed for Type B fallback)
 * @param index - Position in the fields array (only index 0 can use the fallback)
 * @returns Parsed value, or undefined if no matching param found
 *
 * @example
 * // Type C: S3776 has [{default: 15, displayName: 'threshold'}]
 * // Client sends: { key: 'threshold', value: '20' }
 * buildPrimitiveConfiguration({default: 15, displayName: 'threshold'}, paramsLookup, params, 0)
 * // Returns: 20
 *
 * @example
 * // Type B: S1440 has [{default: 'smart'}] (no displayName)
 * // Client sends first param: { key: 'anything', value: 'strict' }
 * // Note: This fallback path is only used in tests; production requests won't have this param.
 * buildPrimitiveConfiguration({default: 'smart'}, paramsLookup, params, 0)
 * // Returns: 'strict' (uses first param as fallback)
 *
 * @example
 * // Type D: S1105 has [{default: '1tbs', displayName: 'braceStyle'}, [{field: 'allowSingleLine', ...}]]
 * // Client sends: { key: 'braceStyle', value: 'allman' }
 * buildPrimitiveConfiguration({default: '1tbs', displayName: 'braceStyle'}, paramsLookup, params, 0)
 * // Returns: 'allman'
 *
 * @see RULE_CONFIG_PATTERNS.md "Type B", "Type C", and "Type D" sections
 */
function buildPrimitiveConfiguration(
  element: { default: unknown; displayName?: string },
  paramsLookup: Map<string, string>,
  params: analyzer.IRuleParam[],
  index: number,
) {
  const sqKey = element.displayName;

  if (sqKey) {
    const paramValue = paramsLookup.get(sqKey);
    if (paramValue !== undefined) {
      return parseParamValue(paramValue, element.default);
    }
  } else if (params.length > 0 && index === 0) {
    // Fallback for Type B primitives without displayName.
    // This branch is not reached in production since SonarQube only exposes parameters
    // with displayName. It exists for testing purposes and non-SonarQube clients.
    return parseParamValue(isString(params[0].value) ? params[0].value : '', element.default);
  }
}

/**
 * Build RuleConfig entries from a SonarQube rule key and gRPC params.
 *
 * Looks up the rule in ruleMetaMap, builds the ESLint configurations array from
 * the gRPC params, and returns one RuleConfig per supported language.
 *
 * @param ruleKey - The SonarQube rule key (e.g. 'S107')
 * @param params - Rule parameters from the gRPC request
 * @returns Array of RuleConfig entries (one per language), or null if the rule is unknown
 */
export function buildRuleConfigurations(
  ruleKey: string,
  params: analyzer.IRuleParam[],
): RuleConfig[] | null {
  const ruleMeta = ruleMetaMap.get(ruleKey);
  if (!ruleMeta) {
    debug(`buildRuleConfigurations: Unknown rule ${ruleKey}`);
    return null;
  }

  const configurations = buildConfigurations(params, ruleMeta.fields ?? []);
  const fileTypeTargets: FileType[] = ruleMeta.scope === 'Tests' ? ['TEST'] : ['MAIN'];

  return ruleMeta.languages.map(language => ({
    key: ruleKey,
    configurations,
    fileTypeTargets,
    language,
    analysisModes: ['DEFAULT'] as const,
  }));
}

/**
 * Build ESLint configurations array from gRPC params using rule field definitions.
 *
 * Handles all four configuration patterns defined in RULE_CONFIG_PATTERNS.md:
 * - **Type A** `[[{field,...}]]` → Single object config
 * - **Type B** `[{default}]` → Single primitive without SQ key
 * - **Type C** `[{default, displayName}]` → Single primitive with SQ key
 * - **Type D** `[{default, displayName}, [{field},...]]` → Mixed primitive + object
 *
 * @see RULE_CONFIG_PATTERNS.md for complete documentation of all patterns
 */
function buildConfigurations(
  params: analyzer.IRuleParam[],
  fields: ESLintConfiguration,
): unknown[] {
  if (!fields?.length) {
    return [];
  }

  // Convert params array to a lookup map
  const paramsLookup = new Map<string, string>();
  for (const param of params) {
    if (param.key) {
      paramsLookup.set(param.key, isString(param.value) ? param.value : '');
    }
  }

  // Build configurations array - one entry per field element
  const configurations: unknown[] = [];

  for (let index = 0; index < fields.length; index++) {
    const element = fields[index];

    if (Array.isArray(element)) {
      const objConfig = buildObjectConfiguration(element as FieldDef[], paramsLookup);
      if (objConfig !== undefined) {
        configurations.push(objConfig);
      }
    } else {
      const primitiveConfig = buildPrimitiveConfiguration(
        element as { default: unknown; displayName?: string },
        paramsLookup,
        params,
        index,
      );
      if (primitiveConfig !== undefined) {
        configurations.push(primitiveConfig);
      }
    }
  }

  return configurations;
}
