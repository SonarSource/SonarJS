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
      const timings = new ReplayTimings('worker-42');
      timings.measure('selectionLookup', () => 1);
      await timings.measureAsync('selectionLookup', async () => 2);
      timings.measure('typescriptProgramCreation', () => undefined);
      timings.log('success', 'replay');

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
      const timings = new ReplayTimings('worker-43');
      expect(() =>
        timings.measure('programSelectionLoad', () => {
          throw new Error('broken');
        }),
      ).toThrow('broken');
      timings.log('failure', 'record');
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

  it('emits opt-in memory snapshots at milestones before request completion', () => {
    const log = mock.method(console, 'log', () => undefined);
    try {
      const timings = new ReplayTimings('worker-44', true);
      timings.measure('filesystemArchiveLoad', () => undefined);
      timings.measure('programSelectionLoad', () => undefined);
      timings.measure('typescriptProgramCreation', () => undefined);
      timings.measure('fileAnalysis', () => undefined);

      const snapshotPrefix = 'Filesystem cache memory snapshot ';
      const snapshots = () =>
        log.mock.calls
          .map(call => call.arguments[0] as string)
          .filter(line => line.startsWith(snapshotPrefix))
          .map(line => JSON.parse(line.slice(snapshotPrefix.length)));
      expect(snapshots().map(snapshot => snapshot.stage)).toEqual([
        'filesystemArchiveLoad',
        'programSelectionLoad',
        'typescriptProgramCreation',
      ]);
      timings.log('success', 'replay');
      expect(snapshots().map(snapshot => snapshot.stage)).toEqual([
        'filesystemArchiveLoad',
        'programSelectionLoad',
        'typescriptProgramCreation',
        'requestCompletion',
      ]);
      expect(snapshots()[0]).toMatchObject({
        requestId: 'worker-44',
        count: 1,
        rssMiB: expect.any(Number),
        heapUsedMiB: expect.any(Number),
        externalMiB: expect.any(Number),
        arrayBuffersMiB: expect.any(Number),
        heapLimitMiB: expect.any(Number),
      });
    } finally {
      log.mock.restore();
    }
  });
});
