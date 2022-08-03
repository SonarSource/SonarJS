import express from 'express';

import { AnalysisErrorCode } from './services/analysis/errors';

export const errorMiddleware = function (
  error: Error,
  _request: express.Request,
  response: express.Response,
  // the fourth parameter is necessary to identify this as an error middleware
  _next: express.NextFunction,
) {
  console.error(error.stack);
  response.json({
    parsingError: {
      message: error.message,
      code: AnalysisErrorCode.GeneralError,
    },
  });
};
