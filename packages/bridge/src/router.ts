/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import * as express from 'express';
import { Worker } from 'worker_threads';
import { createDelegator } from './delegate.js';

export default function (worker?: Worker): express.Router {
  const router = express.Router();
  const delegate = createDelegator(worker);

  /** Endpoints running on the worker thread */
  router.post('/analyze-project', delegate('on-analyze-project'));
  router.post('/analyze-css', delegate('on-analyze-css'));
  router.post('/analyze-js', delegate('on-analyze-js'));
  router.post('/analyze-html', delegate('on-analyze-html'));
  router.post('/analyze-ts', delegate('on-analyze-ts'));
  router.post('/analyze-with-program', delegate('on-analyze-with-program'));
  router.post('/analyze-yaml', delegate('on-analyze-yaml'));
  router.post('/create-program', delegate('on-create-program'));
  router.post('/create-tsconfig-file', delegate('on-create-tsconfig-file'));
  router.post('/delete-program', delegate('on-delete-program'));
  router.post('/init-linter', delegate('on-init-linter'));
  router.post('/new-tsconfig', delegate('on-new-tsconfig'));
  router.post('/tsconfig-files', delegate('on-tsconfig-files'));

  /** Endpoints running on the main thread */
  router.get('/status', (_, response) => response.send('OK!'));

  return router;
}
