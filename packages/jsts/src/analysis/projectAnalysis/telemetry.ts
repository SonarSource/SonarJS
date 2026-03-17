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
import type { NormalizedAbsolutePath } from '../../../../shared/src/helpers/files.js';
import {
  getTypeScriptVersionSignal,
  isTypeScriptNativePreviewSignal,
} from '../../rules/helpers/package-jsons/dependencies.js';

const NOT_DETECTED = 'not-detected';

let projectAnalysisTelemetryCollector: ProjectAnalysisTelemetryCollector | undefined;

type ProgramCreationTelemetry = {
  attempted: number;
  succeeded: number;
  failed: number;
};

export type ProjectAnalysisTelemetry = {
  typescriptVersion: string;
  typescriptNativePreview: boolean;
  compilerOptions: Record<string, string[]>;
  ecmaScriptVersions: string[];
  programCreation: ProgramCreationTelemetry;
};

export function resetProjectAnalysisTelemetry(baseDir: NormalizedAbsolutePath) {
  projectAnalysisTelemetryCollector = new ProjectAnalysisTelemetryCollector(baseDir);
}

export function getProjectAnalysisTelemetryCollector() {
  if (!projectAnalysisTelemetryCollector) {
    throw new Error('Project analysis telemetry collector has not been initialized');
  }
  return projectAnalysisTelemetryCollector;
}

export function getProjectAnalysisTelemetry(): ProjectAnalysisTelemetry {
  return getProjectAnalysisTelemetryCollector().getTelemetry();
}

export class ProjectAnalysisTelemetryCollector {
  private readonly typescriptVersion: string;
  private readonly typescriptNativePreview: boolean;
  private readonly compilerOptionValues = new Map<string, Set<string>>();
  private readonly ecmaScriptVersions = new Set<string>();
  private readonly enumOptionValues = buildEnumOptionValues();
  private readonly programCreation: ProgramCreationTelemetry = {
    attempted: 0,
    succeeded: 0,
    failed: 0,
  };

  constructor(baseDir: NormalizedAbsolutePath) {
    this.typescriptVersion = detectTypeScriptVersion(baseDir);
    this.typescriptNativePreview = isTypeScriptNativePreviewSignal(baseDir);
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
      const sorted = Array.from(values).sort();
      if (sorted.length > 0) {
        compilerOptions[optionName] = sorted;
      }
    }

    return {
      typescriptVersion: this.typescriptVersion,
      typescriptNativePreview: this.typescriptNativePreview,
      compilerOptions,
      ecmaScriptVersions:
        this.ecmaScriptVersions.size > 0
          ? Array.from(this.ecmaScriptVersions).sort()
          : [NOT_DETECTED],
      programCreation: this.programCreation,
    };
  }

  private recordOptionValue(optionName: string, optionValue: unknown) {
    if (optionValue === undefined) {
      return;
    }
    const values = this.normalizeOptionValue(optionName, optionValue);
    if (values.length === 0) {
      return;
    }
    if (!this.compilerOptionValues.has(optionName)) {
      this.compilerOptionValues.set(optionName, new Set());
    }
    const target = this.compilerOptionValues.get(optionName)!;
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
      return [optionValue];
    }

    if (typeof optionValue === 'boolean' || typeof optionValue === 'bigint') {
      return [String(optionValue)];
    }

    if (typeof optionValue === 'object') {
      return [stableJsonStringify(optionValue)];
    }

    return [String(optionValue)];
  }
}

function detectTypeScriptVersion(baseDir: NormalizedAbsolutePath): string {
  const typeScriptSignal = getTypeScriptVersionSignal(baseDir);
  if (!typeScriptSignal) {
    return NOT_DETECTED;
  }
  try {
    return minVersion(typeScriptSignal)?.version ?? NOT_DETECTED;
  } catch {
    return NOT_DETECTED;
  }
}

function normalizeLibValue(value: string): string {
  const match = /^lib\.(.+)\.d\.ts$/i.exec(value);
  return match ? match[1] : value;
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

function stableJsonStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJsonStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return `{${entries
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableJsonStringify(nested)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
