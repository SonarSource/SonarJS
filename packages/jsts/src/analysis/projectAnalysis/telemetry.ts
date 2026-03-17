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
import type { PackageJson } from 'type-fest';
import { packageJsonStore } from './file-stores/index.js';
import { stripBOM } from '../../rules/helpers/files.js';

const NOT_DETECTED = 'not-detected';
const PATH_COMPILER_OPTIONS = new Set([
  'baseUrl',
  'declarationDir',
  'mapRoot',
  'outDir',
  'outFile',
  'rootDir',
  'rootDirs',
  'sourceRoot',
  'tsBuildInfoFile',
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
      const sanitized = sanitizeStringOptionValue(optionValue);
      return sanitized === undefined ? [] : [sanitized];
    }

    if (typeof optionValue === 'boolean' || typeof optionValue === 'bigint') {
      return [String(optionValue)];
    }

    if (typeof optionValue === 'object') {
      const sanitized = sanitizeObjectOptionValue(optionValue);
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
    try {
      const resolvedVersion = minVersion(signal)?.version;
      if (resolvedVersion) {
        normalizedVersions.add(resolvedVersion);
      }
    } catch {
      continue;
    }
  }
  if (normalizedVersions.size === 0) {
    return [NOT_DETECTED];
  }
  return Array.from(normalizedVersions).sort((a, b) => a.localeCompare(b));
}

function getAvailablePackageJsons(): PackageJson[] {
  const packageJsons: PackageJson[] = [];
  let packageJsonFiles: Iterable<{ content: string | Buffer }>;
  try {
    packageJsonFiles = packageJsonStore.getPackageJsons().values();
  } catch {
    return packageJsons;
  }
  for (const packageJsonFile of packageJsonFiles) {
    const content =
      typeof packageJsonFile.content === 'string'
        ? packageJsonFile.content
        : packageJsonFile.content.toString();
    try {
      packageJsons.push(JSON.parse(stripBOM(content)) as PackageJson);
    } catch {
      continue;
    }
  }
  return packageJsons;
}

function normalizeLibValue(value: string): string {
  const match = /^lib\.(.+)\.d\.ts$/i.exec(value);
  return match ? match[1] : value;
}

function sanitizeStringOptionValue(value: string): string | undefined {
  if (looksLikePath(value)) {
    return undefined;
  }
  return value;
}

function sanitizeObjectOptionValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizeStringOptionValue(value);
  }
  if (Array.isArray(value)) {
    const sanitizedValues = value.flatMap(item => {
      const sanitized = sanitizeObjectOptionValue(item);
      return sanitized === undefined ? [] : [sanitized];
    });
    return sanitizedValues.length > 0 ? sanitizedValues : undefined;
  }
  if (value && typeof value === 'object') {
    const sanitizedEntries = Object.entries(value as Record<string, unknown>).flatMap(
      ([key, nested]) => {
        const sanitized = sanitizeObjectOptionValue(nested);
        return sanitized === undefined ? [] : [[key, sanitized] as [string, unknown]];
      },
    );
    return sanitizedEntries.length > 0 ? Object.fromEntries(sanitizedEntries) : undefined;
  }
  return value;
}

function looksLikePath(value: string): boolean {
  return (
    value.startsWith('/') ||
    /^[a-zA-Z]:[\\/]/.test(value) ||
    value.startsWith('\\\\') ||
    value.startsWith('file://') ||
    value.includes('/') ||
    value.includes('\\')
  );
}

function buildEnumOptionValues(): Map<string, Map<number, string>> {
  const optionDeclarations = ((ts as unknown as { optionDeclarations?: unknown[] })
    .optionDeclarations ?? []) as Array<{
    name: string;
    type: unknown;
  }>;
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
