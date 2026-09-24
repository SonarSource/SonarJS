/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 */

import { performance } from 'node:perf_hooks';
import v8 from 'node:v8';
import { info } from '../../../shared/src/helpers/logging.js';

type Phase =
  | 'filesystemArchiveLoad'
  | 'programSelectionLoad'
  | 'requestNormalization'
  | 'projectAnalysis'
  | 'linterInitialization'
  | 'selectionLookup'
  | 'programOptions'
  | 'typescriptProgramCreation'
  | 'fileAnalysis';

const MEMORY_MILESTONES: ReadonlySet<Phase> = new Set([
  'filesystemArchiveLoad',
  'programSelectionLoad',
  'typescriptProgramCreation',
]);
const MIB = 1024 * 1024;

/** One aggregate log record per filesystem-cache request; never includes source paths or contents. */
export class ReplayTimings {
  private readonly started = performance.now();
  private readonly phases = new Map<Phase, { count: number; ms: number }>();

  constructor(
    private readonly requestId = 'unknown',
    private readonly debugMemory = false,
  ) {}

  measure<T>(phase: Phase, operation: () => T): T {
    const started = performance.now();
    try {
      return operation();
    } finally {
      this.record(phase, performance.now() - started);
      if (MEMORY_MILESTONES.has(phase)) {
        this.snapshot(phase);
      }
    }
  }

  async measureAsync<T>(phase: Phase, operation: () => Promise<T>): Promise<T> {
    const started = performance.now();
    try {
      return await operation();
    } finally {
      this.record(phase, performance.now() - started);
    }
  }

  log(outcome: 'success' | 'failure', mode: 'record' | 'replay') {
    this.snapshot('requestCompletion');
    info(
      `Filesystem cache analysis timing ${JSON.stringify({
        requestId: this.requestId,
        mode,
        outcome,
        totalMs: Math.round(performance.now() - this.started),
        phases: Object.fromEntries(
          [...this.phases].map(([name, { count, ms }]) => [name, { count, ms: Math.round(ms) }]),
        ),
      })}`,
    );
  }

  private snapshot(stage: Phase | 'requestCompletion') {
    if (!this.debugMemory) {
      return;
    }
    const { rss, heapUsed, external, arrayBuffers } = process.memoryUsage();
    const toMiB = (bytes: number) => Math.round(bytes / MIB);
    info(
      `Filesystem cache memory snapshot ${JSON.stringify({
        requestId: this.requestId,
        stage,
        count: stage === 'requestCompletion' ? 1 : this.phases.get(stage)?.count,
        elapsedMs: Math.round(performance.now() - this.started),
        rssMiB: toMiB(rss),
        heapUsedMiB: toMiB(heapUsed),
        externalMiB: toMiB(external),
        arrayBuffersMiB: toMiB(arrayBuffers),
        heapLimitMiB: toMiB(v8.getHeapStatistics().heap_size_limit),
      })}`,
    );
  }

  private record(phase: Phase, duration: number) {
    const previous = this.phases.get(phase) ?? { count: 0, ms: 0 };
    previous.count += 1;
    previous.ms += duration;
    this.phases.set(phase, previous);
  }
}
