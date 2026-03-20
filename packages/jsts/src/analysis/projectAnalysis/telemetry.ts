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
import { minVersion } from 'semver';
import ts from 'typescript';
import { getTypeScriptSignalsFromPackageJsonFiles } from '../../rules/helpers/package-jsons/dependencies.js';
import type { ModuleType } from '../../rules/helpers/package-jsons/dependencies.js';
import { packageJsonStore } from './file-stores/index.js';

const NOT_DETECTED = 'not-detected';
const STRICT_CHILD_COMPILER_OPTIONS = [
  'alwaysStrict',
  'noImplicitAny',
  'noImplicitThis',
  'strictBindCallApply',
  'strictBuiltinIteratorReturn',
  'strictFunctionTypes',
  'strictNullChecks',
  'strictPropertyInitialization',
  'useUnknownInCatchVariables',
] as const satisfies ReadonlyArray<keyof ts.CompilerOptions>;

const COMPILER_OPTIONS_TO_LOG = [
  'allowArbitraryExtensions',
  'allowImportingTsExtensions',
  'allowJs',
  'allowSyntheticDefaultImports',
  'checkJs',
  'esModuleInterop',
  'exactOptionalPropertyTypes',
  'isolatedModules',
  'jsx',
  'lib',
  'module',
  'moduleDetection',
  'moduleResolution',
  'noUncheckedIndexedAccess',
  'resolveJsonModule',
  'resolvePackageJsonExports',
  'resolvePackageJsonImports',
  'skipLibCheck',
  'strict',
  ...STRICT_CHILD_COMPILER_OPTIONS,
  'target',
  'useDefineForClassFields',
  'verbatimModuleSyntax',
] as const satisfies ReadonlyArray<keyof ts.CompilerOptions>;
type LoggedCompilerOptionName = (typeof COMPILER_OPTIONS_TO_LOG)[number];
type StrictChildCompilerOptionName = (typeof STRICT_CHILD_COMPILER_OPTIONS)[number];
const STRICT_CHILD_COMPILER_OPTIONS_SET = new Set<string>(STRICT_CHILD_COMPILER_OPTIONS);

const TARGET_OPTION_VALUES = buildEnumOptionValuesFromRuntimeEnum(ts.ScriptTarget);
const MODULE_OPTION_VALUES = buildEnumOptionValuesFromRuntimeEnum(ts.ModuleKind);
const MODULE_RESOLUTION_OPTION_VALUES = buildEnumOptionValuesFromRuntimeEnum(
  ts.ModuleResolutionKind,
);
const MODULE_DETECTION_OPTION_VALUES = buildEnumOptionValuesFromRuntimeEnum(ts.ModuleDetectionKind);
const JSX_OPTION_VALUES = new Map<number, string>([
  [ts.JsxEmit.None, 'none'],
  [ts.JsxEmit.Preserve, 'preserve'],
  [ts.JsxEmit.React, 'react'],
  [ts.JsxEmit.ReactNative, 'react-native'],
  [ts.JsxEmit.ReactJSX, 'react-jsx'],
  [ts.JsxEmit.ReactJSXDev, 'react-jsxdev'],
]);

let projectAnalysisTelemetryCollector: ProjectAnalysisTelemetryCollector | undefined;

type ProgramCreationTelemetry = {
  attempted: number;
  succeeded: number;
  failed: number;
};

export type ProjectAnalysisTelemetry = {
  typescriptVersions: string[];
  typescriptNativePreview: boolean;
  compilerOptions: Record<string, string[]>;
  ecmaScriptVersions: string[];
  programCreation: ProgramCreationTelemetry;
  esmFileCount: number;
  cjsFileCount: number;
};

export function resetProjectAnalysisTelemetry() {
  projectAnalysisTelemetryCollector = new ProjectAnalysisTelemetryCollector();
}

export function getProjectAnalysisTelemetryCollector() {
  if (!projectAnalysisTelemetryCollector) {
    throw new Error('Project analysis telemetry collector has not been initialized');
  }
  return projectAnalysisTelemetryCollector;
}

export function getOptionalProjectAnalysisTelemetryCollector() {
  return projectAnalysisTelemetryCollector;
}

export function getProjectAnalysisTelemetry(): ProjectAnalysisTelemetry {
  return getProjectAnalysisTelemetryCollector().getTelemetry();
}

export class ProjectAnalysisTelemetryCollector {
  private readonly typescriptVersions: string[];
  private readonly typescriptNativePreview: boolean;
  private readonly compilerOptionValues = new Map<string, Set<string>>();
  private readonly ecmaScriptVersions = new Set<string>();
  private readonly programCreation: ProgramCreationTelemetry = {
    attempted: 0,
    succeeded: 0,
    failed: 0,
  };
  private esmFileCount = 0;
  private cjsFileCount = 0;

  constructor() {
    const { typeScriptVersionSignals, hasTypeScriptNativePreview } =
      getTypeScriptSignalsFromPackageJsonFiles(getPackageJsonFiles());
    this.typescriptVersions = normalizeTypeScriptVersions(typeScriptVersionSignals);
    this.typescriptNativePreview = hasTypeScriptNativePreview;
  }

  recordCompilerOptions(options: ts.CompilerOptions | undefined) {
    if (!options) {
      return;
    }
    for (const optionName of COMPILER_OPTIONS_TO_LOG) {
      const optionValue = readCompilerOptionValue(options, optionName);
      this.recordOptionValue(optionName, optionValue);
    }
  }

  recordEcmaScriptVersion(ecmaScriptYear: number | undefined) {
    if (ecmaScriptYear === undefined) {
      return;
    }
    this.ecmaScriptVersions.add(`ES${ecmaScriptYear}`);
  }

  recordProgramCreationAttempt() {
    this.programCreation.attempted += 1;
  }

  recordProgramCreationSuccess() {
    this.programCreation.succeeded += 1;
  }

  recordProgramCreationFailure() {
    this.programCreation.failed += 1;
  }

  recordModuleType(moduleType: ModuleType | undefined) {
    if (moduleType === 'module') {
      this.esmFileCount += 1;
    } else if (moduleType === 'commonjs') {
      this.cjsFileCount += 1;
    }
  }

  getTelemetry(): ProjectAnalysisTelemetry {
    const compilerOptions: Record<string, string[]> = {};
    for (const [optionName, values] of this.compilerOptionValues.entries()) {
      const sorted = Array.from(values).sort((a, b) => a.localeCompare(b));
      if (sorted.length > 0) {
        compilerOptions[optionName] = sorted;
      }
    }

    return {
      typescriptVersions: this.typescriptVersions,
      typescriptNativePreview: this.typescriptNativePreview,
      compilerOptions,
      ecmaScriptVersions:
        this.ecmaScriptVersions.size > 0
          ? Array.from(this.ecmaScriptVersions).sort((a, b) => a.localeCompare(b))
          : [NOT_DETECTED],
      programCreation: this.programCreation,
      esmFileCount: this.esmFileCount,
      cjsFileCount: this.cjsFileCount,
    };
  }

  private recordOptionValue(optionName: LoggedCompilerOptionName, optionValue: unknown) {
    if (optionValue === undefined) {
      return;
    }
    let values: string[];
    try {
      values = this.normalizeOptionValue(optionName, optionValue);
    } catch {
      return;
    }
    if (values.length === 0) {
      return;
    }
    let target = this.compilerOptionValues.get(optionName);
    if (!target) {
      target = new Set<string>();
      this.compilerOptionValues.set(optionName, target);
    }
    for (const value of values) {
      target.add(value);
    }
  }

  private normalizeOptionValue(
    optionName: LoggedCompilerOptionName,
    optionValue: unknown,
  ): string[] {
    if (Array.isArray(optionValue)) {
      return optionValue.flatMap(item => this.normalizeOptionValue(optionName, item));
    }

    if (optionValue === null) {
      return ['null'];
    }

    if (typeof optionValue === 'number') {
      return [normalizeNumericOptionValue(optionName, optionValue)];
    }

    if (typeof optionValue === 'string') {
      if (optionName === 'lib') {
        return [normalizeLibValue(optionValue)];
      }
      return [optionValue];
    }

    if (typeof optionValue === 'boolean' || typeof optionValue === 'bigint') {
      return [String(optionValue)];
    }

    if (typeof optionValue === 'object') {
      const json = JSON.stringify(optionValue);
      return json === undefined ? [] : [json];
    }

    const json = JSON.stringify(optionValue);
    return json === undefined ? [] : [json];
  }
}

function normalizeTypeScriptVersions(typeScriptSignals: string[]): string[] {
  const normalizedVersions = new Set<string>();
  for (const signal of typeScriptSignals) {
    const resolvedVersion = resolveTypeScriptVersion(signal);
    if (resolvedVersion !== undefined) {
      normalizedVersions.add(resolvedVersion);
    }
  }
  if (normalizedVersions.size === 0) {
    return [NOT_DETECTED];
  }
  return Array.from(normalizedVersions).sort((a, b) => a.localeCompare(b));
}

function readCompilerOptionValue(
  options: ts.CompilerOptions,
  optionName: LoggedCompilerOptionName,
): unknown {
  const directValue = safelyReadCompilerOptionValue(options, optionName);
  if (directValue !== undefined) {
    return directValue;
  }
  if (isStrictChildCompilerOptionName(optionName)) {
    const strictValue = safelyReadCompilerOptionValue(options, 'strict');
    if (typeof strictValue === 'boolean') {
      return strictValue;
    }
  }
  return undefined;
}

function safelyReadCompilerOptionValue(
  options: ts.CompilerOptions,
  optionName: keyof ts.CompilerOptions,
): unknown {
  try {
    return options[optionName];
  } catch {
    return undefined;
  }
}

function isStrictChildCompilerOptionName(
  optionName: LoggedCompilerOptionName,
): optionName is StrictChildCompilerOptionName {
  return STRICT_CHILD_COMPILER_OPTIONS_SET.has(optionName);
}

function resolveTypeScriptVersion(typeScriptSignal: string): string | undefined {
  try {
    return minVersion(typeScriptSignal)?.version;
  } catch {
    return undefined;
  }
}

function getPackageJsonFiles(): Iterable<{ content: string | Buffer }> {
  try {
    return packageJsonStore.getPackageJsons().values();
  } catch {
    return [];
  }
}

function normalizeLibValue(value: string): string {
  const match = /^lib\.(.+)\.d\.ts$/i.exec(value);
  return match ? match[1] : value;
}

function normalizeNumericOptionValue(optionName: string, value: number): string {
  switch (optionName) {
    case 'target':
      return TARGET_OPTION_VALUES.get(value) ?? String(value);
    case 'module':
      return MODULE_OPTION_VALUES.get(value) ?? String(value);
    case 'moduleResolution':
      return MODULE_RESOLUTION_OPTION_VALUES.get(value) ?? String(value);
    case 'moduleDetection':
      return MODULE_DETECTION_OPTION_VALUES.get(value) ?? String(value);
    case 'jsx':
      return JSX_OPTION_VALUES.get(value) ?? String(value);
    default:
      return String(value);
  }
}

function buildEnumOptionValuesFromRuntimeEnum(
  values: Record<string, string | number>,
): Map<number, string> {
  const result = new Map<number, string>();
  for (const [name, value] of Object.entries(values)) {
    if (typeof value === 'number') {
      result.set(value, name.toLowerCase());
    }
  }
  return result;
}
