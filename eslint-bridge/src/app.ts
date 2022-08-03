import express from 'express';
import router from './routing';
import { AnalysisErrorCode } from './services/analysis/errors';

/**
 * The maximum request body size
 */
const MAX_REQUEST_SIZE = '50mb';

export const createApp = function() {
  const app = express();

  app.use(express.json({ limit: MAX_REQUEST_SIZE }));
  app.use(router);
  app.use(errorMiddleware);
  return app;
};

const errorMiddleware = function (
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
