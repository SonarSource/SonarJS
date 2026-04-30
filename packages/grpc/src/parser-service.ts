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
import * as grpc from '@grpc/grpc-js';
import type { TSESTree } from '@typescript-eslint/utils';
import { sonarjs } from './proto/parser.js';
import { build } from '../../analysis/src/jsts/builders/build.js';
import {
  JSTS_ANALYSIS_DEFAULTS,
  type JsTsAnalysisInput,
} from '../../analysis/src/jsts/analysis/analysis.js';
import { parseInProtobuf } from '../../analysis/src/jsts/parsers/ast.js';
import { estree } from '../../analysis/src/jsts/parsers/estree.js';
import { APIError, ErrorCode } from '../../analysis/src/contracts/error.js';
import { normalizeToAbsolutePath } from '../../shared/src/helpers/files.js';
import { info, error as logError } from '../../shared/src/helpers/logging.js';

type IParseRequest = sonarjs.parser.v1.IParseRequest;
type IParseResponse = sonarjs.parser.v1.IParseResponse;
type IParsingError = sonarjs.parser.v1.IParsingError;

const TS_EXTENSIONS = ['.ts', '.tsx', '.cts', '.mts'];

function inferLanguage(sonarLanguage: string | null | undefined, filePath: string): 'js' | 'ts' {
  if (sonarLanguage === 'ts' || sonarLanguage === 'typescript') {
    return 'ts';
  }
  if (sonarLanguage === 'js' || sonarLanguage === 'javascript') {
    return 'js';
  }
  const lower = filePath.toLowerCase();
  if (TS_EXTENSIONS.some(ext => lower.endsWith(ext))) {
    return 'ts';
  }
  return 'js';
}

function buildAnalysisInput(request: IParseRequest): JsTsAnalysisInput {
  const sourceFile = request.sourceFile ?? {};
  const relativePath = sourceFile.relativePath || 'inline.js';
  const fileType =
    sourceFile.fileType === sonarjs.parser.v1.FileType.FILE_TYPE_TEST ? 'TEST' : 'MAIN';
  const language = inferLanguage(sourceFile.sonarLanguage, relativePath);

  return {
    ...JSTS_ANALYSIS_DEFAULTS,
    fileType,
    language,
    filePath: normalizeToAbsolutePath(relativePath),
    fileContent: sourceFile.content ?? '',
    sonarlint: false,
    skipAst: false,
    tsConfigs: [],
    program: undefined,
  };
}

function toParsingError(err: unknown): IParsingError {
  if (err instanceof APIError) {
    const code =
      err.code === ErrorCode.FailingTypeScript
        ? sonarjs.parser.v1.ParsingErrorCode.PARSING_ERROR_CODE_FAILING_TYPESCRIPT
        : sonarjs.parser.v1.ParsingErrorCode.PARSING_ERROR_CODE_PARSING;
    return {
      message: err.message,
      line: err.data?.line,
      column: err.data?.column,
      code,
    };
  }
  return {
    message: err instanceof Error ? err.message : String(err),
    code: sonarjs.parser.v1.ParsingErrorCode.PARSING_ERROR_CODE_PARSING,
  };
}

export function parseFileHandler(
  call: grpc.ServerUnaryCall<IParseRequest, IParseResponse>,
  callback: grpc.sendUnaryData<IParseResponse>,
): void {
  try {
    const input = buildAnalysisInput(call.request);
    info(`Received Parse request for ${input.filePath}`);

    let parseResult;
    try {
      parseResult = build(input);
    } catch (parseErr) {
      const response: IParseResponse = {
        ast: new Uint8Array(),
        parsingErrors: [toParsingError(parseErr)],
      };
      callback(null, response);
      return;
    }

    const protoAst = parseInProtobuf(parseResult.sourceCode.ast as TSESTree.Program);
    const astBytes = estree.Node.encode(protoAst).finish();
    const response: IParseResponse = {
      ast: astBytes,
      parsingErrors: [],
    };
    callback(null, response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logError(`Parse error: ${message}`);
    callback({ code: grpc.status.INTERNAL, message });
  }
}
