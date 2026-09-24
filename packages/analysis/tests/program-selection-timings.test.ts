/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 */

import { describe, it, mock } from 'node:test';
import { expect } from 'expect';
import { ReplayTimings } from '../src/program-selection/replay-timings.js';

describe('ReplayTimings', () => {
  it('aggregates repeated phases in one path-free request record', async () => {
    const log = mock.method(console, 'log', () => undefined);
    try {
      const timings = new ReplayTimings();
      timings.measure('selectionLookup', () => 1);
      await timings.measureAsync('selectionLookup', async () => 2);
      timings.measure('typescriptProgramCreation', () => undefined);
      timings.log('worker-42', 'success', 'replay');

      expect(log.mock.callCount()).toBe(1);
      const line = log.mock.calls[0].arguments[0] as string;
      expect(line.startsWith('Filesystem cache analysis timing ')).toBe(true);
      const record = JSON.parse(line.slice('Filesystem cache analysis timing '.length));
      expect(record).toMatchObject({
        requestId: 'worker-42',
        mode: 'replay',
        outcome: 'success',
        phases: {
          selectionLookup: { count: 2, ms: expect.any(Number) },
          typescriptProgramCreation: { count: 1, ms: expect.any(Number) },
        },
      });
      expect(record.totalMs).toBeGreaterThanOrEqual(0);
    } finally {
      log.mock.restore();
    }
  });

  it('records a failed phase before logging the request failure', () => {
    const log = mock.method(console, 'log', () => undefined);
    try {
      const timings = new ReplayTimings();
      expect(() =>
        timings.measure('programSelectionLoad', () => {
          throw new Error('broken');
        }),
      ).toThrow('broken');
      timings.log('worker-43', 'failure', 'record');
      const line = log.mock.calls[0].arguments[0] as string;
      expect(JSON.parse(line.slice('Filesystem cache analysis timing '.length))).toMatchObject({
        requestId: 'worker-43',
        outcome: 'failure',
        phases: { programSelectionLoad: { count: 1 } },
      });
    } finally {
      log.mock.restore();
    }
  });
});
