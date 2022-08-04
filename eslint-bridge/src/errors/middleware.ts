import express from 'express';
import { AnalysisErrorCode } from '../services/analysis/errors';
import { ErrorType, SonarError } from './builder';

export function errorMiddleware(
  error: Error,
  _request: express.Request,
  response: express.Response,
  // the fourth parameter is necessary to identify this as an error middleware
  _next: express.NextFunction,
) {
  console.error(error.stack);

  let errorType: ErrorType;
  if (error instanceof SonarError) {
    errorType = error.type;
  } else {
    errorType = 'General';
  }

  switch (errorType) {
    case 'General': {
      response.json({ error: error.message });
      break;
    }
    case 'Parsing': {
      response.json({
        parsingError: {
          message: error.message,
          code: AnalysisErrorCode.GeneralError,
        },
      });
      break;
    }
  }
}
