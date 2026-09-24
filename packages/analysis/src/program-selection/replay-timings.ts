/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 */

import { performance } from 'node:perf_hooks';
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

/** One aggregate log record per filesystem-cache request; never includes source paths or contents. */
export class ReplayTimings {
  private readonly started = performance.now();
  private readonly phases = new Map<Phase, { count: number; ms: number }>();

  measure<T>(phase: Phase, operation: () => T): T {
    const started = performance.now();
    try {
      return operation();
    } finally {
      this.record(phase, performance.now() - started);
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

  log(requestId: string, outcome: 'success' | 'failure', mode: 'record' | 'replay') {
    info(
      `Filesystem cache analysis timing ${JSON.stringify({
        requestId,
        mode,
        outcome,
        totalMs: Math.round(performance.now() - this.started),
        phases: Object.fromEntries(
          [...this.phases].map(([name, { count, ms }]) => [name, { count, ms: Math.round(ms) }]),
        ),
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
