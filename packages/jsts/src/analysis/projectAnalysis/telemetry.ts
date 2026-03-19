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
import {
  getTypeScriptVersionSignalsFromPackageJson,
  hasTypeScriptNativePreviewSignal,
} from '../../rules/helpers/package-jsons/dependencies.js';
import type { ModuleType } from '../../rules/helpers/package-jsons/dependencies.js';
import type { PackageJson } from 'type-fest';
import { packageJsonStore } from './file-stores/index.js';
import { stripBOM } from '../../rules/helpers/files.js';

const NOT_DETECTED = 'not-detected';
const KNOWN_COMPILER_OPTIONS = buildKnownCompilerOptions();
const PATH_COMPILER_OPTIONS = buildPathCompilerOptions();

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
  private readonly enumOptionValues = buildEnumOptionValues();
  private readonly programCreation: ProgramCreationTelemetry = {
    attempted: 0,
    succeeded: 0,
    failed: 0,
  };
  private esmFileCount = 0;
  private cjsFileCount = 0;

  constructor() {
    const packageJsons = getAvailablePackageJsons();
    this.typescriptVersions = normalizeTypeScriptVersions(
      packageJsons.flatMap(getTypeScriptVersionSignalsFromPackageJson),
    );
    this.typescriptNativePreview = packageJsons.some(hasTypeScriptNativePreviewSignal);
  }

  recordCompilerOptions(options: ts.CompilerOptions | undefined) {
    if (!options) {
      return;
    }
    for (const [optionName, optionValue] of Object.entries(options)) {
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

  private recordOptionValue(optionName: string, optionValue: unknown) {
    if (PATH_COMPILER_OPTIONS.has(optionName)) {
      return;
    }

    if (optionValue === undefined) {
      return;
    }
    const values = this.normalizeOptionValue(optionName, optionValue);
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

  private normalizeOptionValue(optionName: string, optionValue: unknown): string[] {
    if (Array.isArray(optionValue)) {
      return optionValue.flatMap(item => this.normalizeOptionValue(optionName, item));
    }

    if (optionValue === null) {
      return ['null'];
    }

    if (typeof optionValue === 'number') {
      const enumValue = this.enumOptionValues.get(optionName)?.get(optionValue);
      return [enumValue ?? String(optionValue)];
    }

    if (typeof optionValue === 'string') {
      if (optionName === 'lib') {
        return [normalizeLibValue(optionValue)];
      }
      const sanitized = sanitizeStringOptionValue(optionName, optionValue);
      return sanitized === undefined ? [] : [sanitized];
    }

    if (typeof optionValue === 'boolean' || typeof optionValue === 'bigint') {
      return [String(optionValue)];
    }

    if (typeof optionValue === 'object') {
      const sanitized = sanitizeObjectOptionValue(optionName, optionValue);
      if (sanitized === undefined) {
        return [];
      }
      const json = JSON.stringify(sanitized);
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

function resolveTypeScriptVersion(typeScriptSignal: string): string | undefined {
  try {
    return minVersion(typeScriptSignal)?.version;
  } catch {
    return undefined;
  }
}

function getAvailablePackageJsons(): PackageJson[] {
  const packageJsons: PackageJson[] = [];
  for (const packageJsonFile of getPackageJsonFiles()) {
    const packageJson = parsePackageJsonFile(packageJsonFile.content);
    if (packageJson !== undefined) {
      packageJsons.push(packageJson);
    }
  }
  return packageJsons;
}

function getPackageJsonFiles(): Iterable<{ content: string | Buffer }> {
  try {
    return packageJsonStore.getPackageJsons().values();
  } catch {
    return [];
  }
}

function parsePackageJsonFile(content: string | Buffer): PackageJson | undefined {
  const packageJsonContent = typeof content === 'string' ? content : content.toString();
  try {
    return JSON.parse(stripBOM(packageJsonContent)) as PackageJson;
  } catch {
    return undefined;
  }
}

function normalizeLibValue(value: string): string {
  const match = /^lib\.(.+)\.d\.ts$/i.exec(value);
  return match ? match[1] : value;
}

function sanitizeStringOptionValue(optionName: string, value: string): string | undefined {
  if (looksLikeFilesystemPath(value)) {
    return undefined;
  }
  if (!KNOWN_COMPILER_OPTIONS.has(optionName) && looksLikePathWithSeparator(value)) {
    return undefined;
  }
  return value;
}

function sanitizeObjectOptionValue(optionName: string, value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizeStringOptionValue(optionName, value);
  }
  if (Array.isArray(value)) {
    const sanitizedValues = value.flatMap(item => {
      const sanitized = sanitizeObjectOptionValue(optionName, item);
      return sanitized === undefined ? [] : [sanitized];
    });
    return sanitizedValues.length > 0 ? sanitizedValues : undefined;
  }
  if (value && typeof value === 'object') {
    const sanitizedEntries = Object.entries(value as Record<string, unknown>).flatMap(
      ([key, nested]) => {
        const sanitized = sanitizeObjectOptionValue(optionName, nested);
        return sanitized === undefined ? [] : [[key, sanitized] as [string, unknown]];
      },
    );
    return sanitizedEntries.length > 0 ? Object.fromEntries(sanitizedEntries) : undefined;
  }
  return value;
}

function looksLikeFilesystemPath(value: string): boolean {
  return (
    value.startsWith('/') ||
    /^[a-zA-Z]:[\\/]/.test(value) ||
    value.startsWith('\\\\') ||
    value.startsWith('file://') ||
    value.startsWith('./') ||
    value.startsWith('../') ||
    value.startsWith('.\\') ||
    value.startsWith('..\\') ||
    value.startsWith('~/') ||
    value.startsWith('~\\')
  );
}

function looksLikePathWithSeparator(value: string): boolean {
  return value.includes('/') || value.includes('\\');
}

function buildKnownCompilerOptions(): Set<string> {
  return new Set(getTypeScriptOptionDeclarations().map(declaration => declaration.name));
}

function buildPathCompilerOptions(): Set<string> {
  const pathOptions = new Set(['paths']);
  for (const declaration of getTypeScriptOptionDeclarations()) {
    if (
      declaration.isFilePath === true ||
      (declaration.type === 'list' && declaration.element?.isFilePath === true)
    ) {
      pathOptions.add(declaration.name);
    }
  }
  return pathOptions;
}

type TypeScriptOptionDeclaration = {
  name: string;
  type: unknown;
  isFilePath?: boolean;
  element?: {
    isFilePath?: boolean;
  };
};

function getTypeScriptOptionDeclarations(): TypeScriptOptionDeclaration[] {
  return ((ts as unknown as { optionDeclarations?: unknown[] }).optionDeclarations ??
    []) as TypeScriptOptionDeclaration[];
}

function buildEnumOptionValues(): Map<string, Map<number, string>> {
  const optionDeclarations = getTypeScriptOptionDeclarations();
  const enums = new Map<string, Map<number, string>>();
  for (const declaration of optionDeclarations) {
    if (!(declaration.type instanceof Map)) {
      continue;
    }
    const optionValues = new Map<number, string>();
    for (const [name, value] of declaration.type.entries()) {
      if (typeof value === 'number') {
        optionValues.set(value, name);
      }
    }
    if (optionValues.size > 0) {
      enums.set(declaration.name, optionValues);
    }
  }
  return enums;
}
