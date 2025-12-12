/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import path from 'node:path/posix';
import { Worker } from 'node:worker_threads';
import { describe, before, after, it } from 'node:test';
import { expect } from 'expect';
import { ErrorCode } from '../../shared/src/errors/error.js';
import { toUnixPath } from '../../shared/src/helpers/files.js';

describe('worker', () => {
  let worker: Worker;

  before(() => {
    worker = new Worker(
      path.join(toUnixPath(import.meta.dirname), '../../../lib/bridge/src/worker.js'),
      {
        workerData: { context: {} },
      },
    );
  });

  after(async () => {
    await worker.terminate();
  });

  it('should post back results', async () => {
    let { promise, resolve, reject } = Promise.withResolvers<void>();
    worker.once('message', message => {
      try {
        expect(message).toEqual({
          type: 'success',
          result: 'OK',
        });
        resolve();
      } catch (e) {
        reject(e);
      }
    });

    worker.postMessage({ type: 'on-init-linter', data: { rules: [] } });
    await promise;
  });

  it('should post back stringified results', async () => {
    let { promise, resolve, reject } = Promise.withResolvers<void>();
    const input = {
      filePath: path.join(import.meta.dirname, 'fixtures', 'worker', 'file.css'),
      rules: [{ key: 'no-duplicate-selectors', configurations: [] }],
    };
    worker.once('message', message => {
      const { type, result } = message;
      try {
        expect(type).toEqual('success');
        expect(result).toEqual({
          issues: [
            expect.objectContaining({
              ruleId: 'no-duplicate-selectors',
            }),
          ],
        });
        resolve();
      } catch (e) {
        reject(e);
      }
    });

    worker.postMessage({ type: 'on-analyze-css', data: input });
    await promise;
  });

  it('should post back errors', async () => {
    let { promise, resolve, reject } = Promise.withResolvers<void>();
    worker.once('message', message => {
      const { type, error } = message;
      try {
        expect(type).toEqual('failure');
        expect(error.code).toEqual(ErrorCode.Unexpected);
        expect(error.message).toEqual('baseDir is required');
        resolve();
      } catch (e) {
        reject(e);
      }
    });

    worker.postMessage({ type: 'on-analyze-project', data: {} });
    await promise;
  });
});
