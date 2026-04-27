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

import type { AnalyzeProjectProtoRequest, RequestResult } from '../analyze-project-request.js';
import type { sonarjs } from '../proto/analyze-project.js';

type AnalyzeProjectStreamResponse = sonarjs.analyzeproject.v1.IAnalyzeProjectStreamResponse;
type AnalyzeProjectUnaryResponse = sonarjs.analyzeproject.v1.IAnalyzeProjectUnaryResponse;

export type AnalyzeProjectWorkerInMessage =
  | { type: 'analyze-stream'; requestId: string; request: AnalyzeProjectProtoRequest }
  | { type: 'analyze-unary'; requestId: string; request: AnalyzeProjectProtoRequest }
  | { type: 'cancel'; requestId: string }
  | { type: 'close' };

export type AnalyzeProjectWorkerOutMessage =
  | { type: 'event'; requestId: string; response: AnalyzeProjectStreamResponse }
  | { type: 'stream-complete'; requestId: string; result: RequestResult }
  | {
      type: 'unary-complete';
      requestId: string;
      result: RequestResult<AnalyzeProjectUnaryResponse>;
    }
  | { type: 'cancel-complete'; requestId: string; result: RequestResult };
