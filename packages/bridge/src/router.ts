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
import express from 'express';
import { Worker } from 'worker_threads';
import { delegate } from './worker';

export default function (worker: Worker): express.Router {
  const router = express.Router();

  /** Endpoints running on the worker thread */
  router.post('/analyze-css', delegate(worker, 'on-analyze-css'));
  router.post('/analyze-js', delegate(worker, 'on-analyze-js'));
  router.post('/analyze-html', delegate(worker, 'on-analyze-html'));
  router.post('/analyze-ts', delegate(worker, 'on-analyze-ts'));
  router.post('/analyze-with-program', delegate(worker, 'on-analyze-with-program'));
  router.post('/analyze-yaml', delegate(worker, 'on-analyze-yaml'));
  router.post('/create-program', delegate(worker, 'on-create-program'));
  router.post('/create-tsconfig-file', delegate(worker, 'on-create-tsconfig-file'));
  router.post('/delete-program', delegate(worker, 'on-delete-program'));
  router.post('/init-linter', delegate(worker, 'on-init-linter'));
  router.post('/new-tsconfig', delegate(worker, 'on-new-tsconfig'));
  router.post('/tsconfig-files', delegate(worker, 'on-tsconfig-files'));

  /** Endpoints running on the main thread */
  router.get('/status', (_, response) => response.send('OK!'));

  return router;
}
