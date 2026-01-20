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
import { analyzer } from '../proto/language_analyzer.js';
import type {
  ProjectAnalysisInput,
  JsTsFiles,
} from '../../../jsts/src/analysis/projectAnalysis/projectAnalysis.js';
import type { RuleConfig } from '../../../jsts/src/linter/config/rule-config.js';
import type { FileType } from '../../../shared/src/helpers/files.js';
import type { ESLintConfiguration } from '../../../jsts/src/rules/helpers/configs.js';
import type { FieldDef } from './types.js';
import { ruleMetaMap } from './rule-metadata.js';

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
 * Transform source files from gRPC protobuf format to the internal JsTsFiles format.
 *
 * The gRPC request contains an array of `ISourceFile` objects with `relativePath`, `content`,
 * and optionally `fileScope`. This function converts them into a dictionary keyed by relative
 * path, which is the format expected by the `analyzeProject` function.
 *
 * File scope handling:
 * - If fileScope is explicitly set in the request, use it (MAIN or TEST)
 * - Otherwise, default to 'MAIN' (context-based inference could be added in the future)
 *
 * @param sourceFiles - Array of source files from the gRPC request
 * @returns Dictionary of files keyed by relative path
 */
function transformSourceFiles(sourceFiles: analyzer.ISourceFile[]): JsTsFiles {
  const files: JsTsFiles = {};

  for (const sourceFile of sourceFiles) {
    const relativePath = sourceFile.relativePath ?? '';
    let fileType: FileType = 'MAIN';

    if (sourceFile.fileScope !== null && sourceFile.fileScope !== undefined) {
      fileType = sourceFile.fileScope === analyzer.FileScope.TEST ? 'TEST' : 'MAIN';
    } else {
      // TODO: Infer file scope from context when not explicitly provided by the caller
    }

    files[relativePath] = {
      filePath: relativePath,
      fileContent: sourceFile.content ?? '',
      fileType,
    };
  }

  return files;
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
    return parseParamValue(params[0].value ?? '', element.default);
  }
}

/**
 * Build ESLint configurations array from gRPC params using rule field definitions.
 *
 * This is the main orchestrator for transforming SonarQube parameter key-value pairs
 * into the ESLint configuration array format. It handles all four configuration patterns
 * defined in RULE_CONFIG_PATTERNS.md:
 *
 * **Pattern Types:**
 * - **Type A** `[[{field,...}]]` → Single object config (55 rules, e.g., S100, S107)
 * - **Type B** `[{default}]` → Single primitive without SQ key (5 rules, e.g., S1440)
 * - **Type C** `[{default, displayName}]` → Single primitive with SQ key (2 rules, e.g., S3776)
 * - **Type D** `[{default, displayName}, [{field},...]]` → Mixed primitive + object (2 rules, e.g., S1105)
 *
 * **Algorithm:**
 * 1. Convert params array to a lookup map for O(1) access
 * 2. Iterate through each element in the fields array
 * 3. If element is an array → delegate to `buildObjectConfiguration` (Type A, Type D object part)
 * 4. If element is not an array → delegate to `buildPrimitiveConfiguration` (Type B, C, D primitive part)
 * 5. Only include elements in output if at least one param matched
 *
 * @param params - Array of rule parameters from the gRPC request (key-value string pairs)
 * @param fields - ESLintConfiguration from the rule's config.ts defining the expected structure
 * @returns Array of configuration values ready to pass to ESLint rule
 *
 * @example
 * // Type A: S107 - Single object config
 * // fields: [[{field: 'max', displayName: 'maximumFunctionParameters', default: 7}]]
 * // params: [{key: 'maximumFunctionParameters', value: '5'}]
 * buildConfigurations(params, fields) // → [{ max: 5 }]
 *
 * @example
 * // Type D: S1105 - Mixed primitive + object
 * // fields: [{default: '1tbs', displayName: 'braceStyle'}, [{field: 'allowSingleLine', default: true}]]
 * // params: [{key: 'braceStyle', value: 'allman'}, {key: 'allowSingleLine', value: 'false'}]
 * buildConfigurations(params, fields) // → ['allman', { allowSingleLine: false }]
 *
 * @see RULE_CONFIG_PATTERNS.md for complete documentation of all patterns
 * @see docs/DEV.md "The `fields` Array (`config.ts`)" section
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
      paramsLookup.set(param.key, param.value ?? '');
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

/**
 * Transform a single active rule from gRPC format to RuleConfig entries.
 *
 * Creates one RuleConfig entry per supported language. For example, a rule like S107
 * that supports both 'js' and 'ts' will produce two RuleConfig entries with identical
 * configurations but different `language` values.
 *
 * **Transformation steps:**
 * 1. Look up rule metadata by SonarQube key (e.g., 'S107') in the ruleMetaMap
 * 2. If rule is unknown, skip it (return empty array)
 * 3. Build configurations array from params using the rule's field definitions
 * 4. Determine fileTypeTargets based on rule scope ('Main' → ['MAIN'], 'Tests' → ['TEST'])
 * 5. Create a RuleConfig for each language the rule supports
 *
 * @param activeRule - Active rule from the gRPC request with ruleKey and params
 * @returns Array of RuleConfig entries (one per supported language), or empty if rule unknown
 *
 * @example
 * // S107 supports ['js', 'ts'] and has scope 'Main'
 * transformActiveRule({ ruleKey: 'S107', params: [{key: 'maximumFunctionParameters', value: '5'}] })
 * // Returns:
 * // [
 * //   { key: 'S107', configurations: [{ max: 5 }], fileTypeTargets: ['MAIN'], language: 'js', analysisModes: ['DEFAULT'] },
 * //   { key: 'S107', configurations: [{ max: 5 }], fileTypeTargets: ['MAIN'], language: 'ts', analysisModes: ['DEFAULT'] }
 * // ]
 */
function transformActiveRule(activeRule: analyzer.IActiveRule): RuleConfig[] {
  const repo = activeRule.ruleKey?.repo ?? '';
  const ruleKey = activeRule.ruleKey?.rule ?? '';

  if (repo !== 'javascript' && repo !== 'typescript') {
    console.warn(
      `Ignoring rule ${ruleKey} with unsupported repository '${repo}'. ` +
        `SonarJS analyzer only supports 'javascript' and 'typescript' repositories.`,
    );
    return [];
  }

  const ruleMeta = ruleMetaMap.get(ruleKey);

  if (!ruleMeta) {
    console.log(`[DEBUG] transformActiveRule: Unknown rule ${repo}:${ruleKey}`);
    return [];
  }

  const params = activeRule.params || [];
  const configurations = buildConfigurations(params, ruleMeta.fields ?? []);

  // Determine file type targets from scope
  const fileTypeTargets: FileType[] = ruleMeta.scope === 'Tests' ? ['TEST'] : ['MAIN'];

  // Create a rule config for each supported language
  return ruleMeta.languages.map(language => ({
    key: ruleKey,
    configurations,
    fileTypeTargets,
    language,
    analysisModes: ['DEFAULT'] as const,
  }));
}

/**
 * Transform all active rules from gRPC format to a flat RuleConfig array.
 *
 * Maps each active rule through `transformActiveRule` and flattens the results.
 * Since each rule can produce multiple RuleConfig entries (one per language),
 * flatMap is used to combine them into a single array.
 *
 * @param activeRules - Array of active rules from the gRPC request
 * @returns Flat array of RuleConfig entries for all rules and languages
 */
function transformActiveRules(activeRules: analyzer.IActiveRule[]): RuleConfig[] {
  return activeRules.flatMap(transformActiveRule);
}

/**
 * Transform a gRPC AnalyzeRequest into the ProjectAnalysisInput format.
 *
 * This is the main entry point for request transformation in the gRPC workflow.
 * It converts the protobuf-based request format into the internal format expected
 * by the `analyzeProject` function.
 *
 * **Key differences from SonarQube HTTP workflow:**
 * - gRPC sends file contents inline (no filesystem access needed)
 * - gRPC sends rule params as string key-value pairs (needs type parsing)
 * - SonarQube HTTP sends already-typed configuration objects
 *
 * **Transformation flow:**
 * ```
 * IAnalyzeRequest
 *   ├── sourceFiles[] ──→ transformSourceFiles() ──→ JsTsFiles (keyed by path)
 *   └── activeRules[] ──→ transformActiveRules() ──→ RuleConfig[] (one per rule+language)
 * ```
 *
 * @param request - The gRPC AnalyzeRequest containing source files and active rules
 * @returns ProjectAnalysisInput ready to pass to analyzeProject()
 *
 * @see docs/DEV.md "External workflow (gRPC - without SonarQube)" section
 */
export function transformRequestToProjectInput(
  request: analyzer.IAnalyzeRequest,
): ProjectAnalysisInput {
  // Handle empty/undefined arrays from proto3
  const sourceFiles = request.sourceFiles || [];
  const activeRules = request.activeRules || [];

  return {
    files: transformSourceFiles(sourceFiles),
    rules: transformActiveRules(activeRules),
    configuration: {
      // baseDir is irrelevant since we don't access the filesystem
      baseDir: '/',
      // gRPC requests contain all file contents inline - no filesystem access needed
      canAccessFileSystem: false,
    },
  };
}
