import express from 'express';
import router from './routing';

/**
 * The maximum request body size
 */
const MAX_REQUEST_SIZE = '50mb';

export default function () {
  const app = express();

  app.use(express.json({ limit: MAX_REQUEST_SIZE }));
  app.use(router);
  return app;
}
