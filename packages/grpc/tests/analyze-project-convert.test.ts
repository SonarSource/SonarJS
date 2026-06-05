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
    generatedSources: {
      familyCount: 1,
      resolvedFileCount: 4,
      taggedFileCount: 2,
      outOfScopeFileCount: 1,
      excludedFileCount: 1,
      families: [
        {
          family: '@graphql-codegen/cli',
          resolvedFileCount: 4,
          taggedFileCount: 2,
          outOfScopeFileCount: 1,
          excludedFileCount: 1,
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
  it('should preserve generated-source telemetry through protobuf serialization', () => {
    const telemetry = createProjectAnalysisTelemetry();

    const unaryResponse = toAnalyzeProjectUnaryResponse(
      {
        files: createFileResults(),
        meta: {
          warnings: [],
          telemetry,
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

    const streamResponse = toAnalyzeProjectStreamResponse(
      {
        messageType: 'meta',
        warnings: [],
        telemetry,
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
  });
});
