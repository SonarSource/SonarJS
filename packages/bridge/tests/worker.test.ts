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
import path from 'path';
import { Worker } from 'worker_threads';
import { ErrorCode } from '@sonar/shared';

describe('worker', () => {
  let worker: Worker;

  beforeAll(() => {
    worker = new Worker(path.resolve(__dirname, '../src/worker.js'), {
      workerData: { context: {} },
    });
  });

  afterAll(async () => {
    await worker.terminate();
  });

  it('should post back results', done => {
    worker.once('message', message => {
      expect(message).toEqual({
        type: 'success',
        result: 'OK!',
      });
      done();
    });

    worker.postMessage({ type: 'on-new-tsconfig' });
  });

  it('should post back stringified results', done => {
    const input = {
      filePath: path.join(__dirname, 'fixtures', 'worker', 'file.css'),
      rules: [{ key: 'no-duplicate-selectors', configurations: [] }],
    };
    worker.once('message', message => {
      const { type, result } = message;
      expect(type).toEqual('success');
      expect(typeof result).toBe('string');
      expect(JSON.parse(result)).toEqual({
        issues: [
          expect.objectContaining({
            ruleId: 'no-duplicate-selectors',
          }),
        ],
      });
      done();
    });

    worker.postMessage({ type: 'on-analyze-css', data: input });
  });

  it('should post back errors', done => {
    const tsconfig = path.resolve('does', 'not', 'exist');
    worker.once('message', message => {
      const { type, error } = message;
      expect(type).toEqual('failure');
      expect(error.code).toEqual(ErrorCode.Unexpected);
      expect(error.message).toEqual(`Cannot read file '${tsconfig}'.`);
      done();
    });

    worker.postMessage({ type: 'on-tsconfig-files', data: { tsconfig } });
  });
});
