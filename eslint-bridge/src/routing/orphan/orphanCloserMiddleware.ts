import http from 'http';
import express from 'express';
import Timeout from './Timeout';

/**
 * Express middleware that closes the server if no request is received in a laps of time
 */
export function orphanCloserMiddleware(server: http.Server, shutdownTimeout: number) {
  const timeout = new Timeout(() => {
    if (server.listening) {
      server.close();
    }
  }, shutdownTimeout);
  timeout.init();
  return {
    middleware(_request: express.Request, res: express.Response, next: express.NextFunction) {
      timeout.cancel();
      res.on('finish', function () {
        timeout.init();
      });
      next();
    },
    cancel() {
      timeout.cancel();
    },
  };
}
