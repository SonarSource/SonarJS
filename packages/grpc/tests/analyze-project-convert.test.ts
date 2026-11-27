/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */

import { describe, it } from 'node:test';
import { expect } from 'expect';
import { createFileResults } from '../../analysis/src/projectAnalysis.js';
import {
  toAnalyzeProjectStreamResponse,
  toAnalyzeProjectUnaryResponse,
} from '../src/analyze-project-convert.js';
import { sonarjs as analyzeProjectProto } from '../src/proto/analyze-project.js';
import type { JsTsAnalysisOutput } from '../../analysis/src/jsts/analysis/analysis.js';
import { normalizeToAbsolutePath } from '../../shared/src/helpers/files.js';

function roundTripFileResult(result: JsTsAnalysisOutput) {
  const filePath = normalizeToAbsolutePath('/project/file.ts');
  const files = createFileResults();
  files[filePath] = result;
  const { AnalyzeProjectUnaryResponse, AnalyzeProjectStreamResponse } =
    analyzeProjectProto.analyzeproject.v1;
  const unary = AnalyzeProjectUnaryResponse.decode(
    AnalyzeProjectUnaryResponse.encode(
      toAnalyzeProjectUnaryResponse({ files, meta: { warnings: [] } }),
    ).finish(),
  );
  const stream = AnalyzeProjectStreamResponse.decode(
    AnalyzeProjectStreamResponse.encode(
      toAnalyzeProjectStreamResponse({ ...result, messageType: 'fileResult', filename: filePath }),
    ).finish(),
  );
  return [unary.files[filePath], stream.fileResult!.result!];
}

function createProjectAnalysisTelemetry() {
  return {
    typescriptVersions: ['5.0.0'],
    typescriptNativePreview: false,
    compilerOptions: {},
    ecmaScriptVersions: ['ES2022'],
    programCreation: {
      attempted: 1,
      succeeded: 1,
      failed: 0,
    },
    esmFileCount: 0,
    cjsFileCount: 0,
    denoImportCounts: {},
    packageImportFileCounts: {
      react: 2,
    },
    generatedSources: {
      familyCount: 1,
      resolvedFileCount: 4,
      taggedFileCount: 2,
      families: [
        {
          family: '@graphql-codegen/cli',
          resolvedFileCount: 4,
          taggedFileCount: 2,
        },
      ],
    },
  };
}

function toPlainTelemetryValue(value: object | null | undefined) {
  if (value && 'toJSON' in value && typeof value.toJSON === 'function') {
    return value.toJSON();
  }

  return value;
}

describe('analyze-project convert', () => {
  it('does not transport compiler requirements as rule metadata', () => {
    const { JsTsRule } = analyzeProjectProto.analyzeproject.v1;
    const ruleWithCompilerRequest = { key: 'custom/api-usages', requestedMaxNodeModuleJsDepth: 4 };
    const decoded = JsTsRule.decode(JsTsRule.encode(ruleWithCompilerRequest).finish());
    expect(decoded.key).toBe(ruleWithCompilerRequest.key);
    expect(decoded).not.toHaveProperty('requestedMaxNodeModuleJsDepth');
    expect(JsTsRule.fromObject(ruleWithCompilerRequest)).not.toHaveProperty(
      'requestedMaxNodeModuleJsDepth',
    );
    // Decoding also ignores unrecognized rule field 7.
    expect(JsTsRule.decode(Uint8Array.from([0x38, 4]))).not.toHaveProperty(
      'requestedMaxNodeModuleJsDepth',
    );
  });

  it('does not transport the retired external API inventory', () => {
    const legacyResult = {
      issues: [],
      externalApiUsages: { usages: [], coverage: 'COMPLETE', unresolvedCalls: 0 },
    };
    for (const result of roundTripFileResult(legacyResult)) {
      expect(result).not.toHaveProperty('externalApiUsages');
    }
    expect(analyzeProjectProto.analyzeproject.v1).not.toHaveProperty('ExternalApiUsages');
    expect(analyzeProjectProto.analyzeproject.v1).not.toHaveProperty('ExternalApiUsage');
  });

  it('should preserve final metadata through protobuf serialization', () => {
    const telemetry = createProjectAnalysisTelemetry();

    const unaryResponse = toAnalyzeProjectUnaryResponse(
      {
        files: createFileResults(),
        meta: {
          warnings: [],
          telemetry,
          contextRecorded: true,
        },
      },
      new Map(),
    );
    const decodedUnary = analyzeProjectProto.analyzeproject.v1.AnalyzeProjectUnaryResponse.decode(
      analyzeProjectProto.analyzeproject.v1.AnalyzeProjectUnaryResponse.encode(
        unaryResponse,
      ).finish(),
    );

    expect(toPlainTelemetryValue(decodedUnary.meta?.telemetry?.generatedSources)).toEqual(
      telemetry.generatedSources,
    );
    expect(decodedUnary.meta?.telemetry?.packageImportFileCounts).toEqual(
      telemetry.packageImportFileCounts,
    );
    expect(decodedUnary.meta?.contextRecorded).toBe(true);

    const streamResponse = toAnalyzeProjectStreamResponse(
      {
        messageType: 'meta',
        warnings: [],
        telemetry,
        contextRecorded: true,
      },
      new Map(),
    );
    const decodedStream = analyzeProjectProto.analyzeproject.v1.AnalyzeProjectStreamResponse.decode(
      analyzeProjectProto.analyzeproject.v1.AnalyzeProjectStreamResponse.encode(
        streamResponse,
      ).finish(),
    );

    expect(toPlainTelemetryValue(decodedStream.meta?.telemetry?.generatedSources)).toEqual(
      telemetry.generatedSources,
    );
    expect(decodedStream.meta?.telemetry?.packageImportFileCounts).toEqual(
      telemetry.packageImportFileCounts,
    );
    expect(decodedStream.meta?.contextRecorded).toBe(true);
  });
});
