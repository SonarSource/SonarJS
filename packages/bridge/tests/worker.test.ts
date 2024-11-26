/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import path from 'path';
import { Worker } from 'worker_threads';
import { describe, before, after, it } from 'node:test';
import { expect } from 'expect';
import { ErrorCode } from '../../shared/src/errors/error.js';

describe('worker', () => {
  let worker: Worker;

  before(() => {
    worker = new Worker(path.resolve(import.meta.dirname, '../../../lib/bridge/src/worker.js'), {
      workerData: { context: {} },
    });
  });

  after(async () => {
    await worker.terminate();
  });

  it('should post back results', async () => {
    let resolver: (value?: unknown) => void;
    const p = new Promise(resolve => {
      resolver = resolve;
    });
    worker.once('message', message => {
      expect(message).toEqual({
        type: 'success',
        result: 'OK!',
      });
      resolver();
    });

    worker.postMessage({ type: 'on-new-tsconfig' });
    await p;
  });

  it('should post back stringified results', async () => {
    let resolver: (value?: unknown) => void;
    const p = new Promise(resolve => {
      resolver = resolve;
    });
    const input = {
      filePath: path.join(import.meta.dirname, 'fixtures', 'worker', 'file.css'),
      rules: [{ key: 'no-duplicate-selectors', configurations: [] }],
    };
    worker.once('message', message => {
      const { type, result } = message;
      expect(type).toEqual('success');
      expect(result).toEqual({
        issues: [
          expect.objectContaining({
            ruleId: 'no-duplicate-selectors',
          }),
        ],
      });
      resolver();
    });

    worker.postMessage({ type: 'on-analyze-css', data: input });
    await p;
  });

  it('should post back errors', () => {
    const tsconfig = path.resolve('does', 'not', 'exist');
    worker.once('message', message => {
      const { type, error } = message;
      expect(type).toEqual('failure');
      expect(error.code).toEqual(ErrorCode.Unexpected);
      expect(error.message).toEqual(`Cannot read file '${tsconfig}'.`);
    });

    worker.postMessage({ type: 'on-tsconfig-files', data: { tsconfig } });
  });
});
