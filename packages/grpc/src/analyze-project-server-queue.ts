/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */

export const ANALYSIS_CANCELLATION_TIMEOUT_MS = 15_000;
export const MAX_PENDING_ANALYSIS_REQUESTS = 16;

export class AnalysisQueueClosedError extends Error {
  constructor() {
    super('Analyze-project request queue is closed');
  }
}

export class AnalysisRequestCancelledError extends Error {
  constructor() {
    super('Analyze-project request was cancelled before it started');
  }
}

type AnalysisCancellation = { active: false } | { active: true; result: Promise<boolean> };

type AnalysisQueueEntry = {
  cancellationResult?: Promise<boolean>;
  cancellationTimeout?: NodeJS.Timeout;
  reject: (error: unknown) => void;
  requestCancellation: () => Promise<boolean>;
  resolve: (result: unknown) => void;
  run: () => Promise<unknown>;
  state: 'active' | 'pending' | 'settled';
};

export type AnalysisQueueSubmission<T> = {
  cancel: () => AnalysisCancellation;
  result: Promise<T>;
};

export type AnalysisQueueAdmission<T> =
  | { accepted: true; submission: AnalysisQueueSubmission<T> }
  | { accepted: false; reason: 'closed' | 'full' };

export class AnalysisRequestQueue {
  private active: AnalysisQueueEntry | undefined;
  private closed = false;
  private readonly pending: AnalysisQueueEntry[] = [];

  constructor(
    private readonly maxPending = MAX_PENDING_ANALYSIS_REQUESTS,
    private readonly cancellationTimeoutMs = ANALYSIS_CANCELLATION_TIMEOUT_MS,
    private readonly onCancellationTimeout: () => void | Promise<void> = () => {},
  ) {
    if (!Number.isInteger(maxPending) || maxPending < 0) {
      throw new Error('Maximum pending analysis requests must be a non-negative integer');
    }
  }

  enqueue<T>(
    run: () => Promise<T>,
    requestCancellation: () => Promise<boolean>,
  ): AnalysisQueueAdmission<T> {
    if (this.closed) {
      return { accepted: false, reason: 'closed' };
    }
    if (this.active && this.pending.length >= this.maxPending) {
      return { accepted: false, reason: 'full' };
    }

    let resolve!: (result: T) => void;
    let reject!: (error: unknown) => void;
    const result = new Promise<T>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    const entry: AnalysisQueueEntry = {
      reject,
      requestCancellation,
      resolve: value => resolve(value as T),
      run,
      state: this.active ? 'pending' : 'active',
    };

    if (this.active) {
      this.pending.push(entry);
    } else {
      this.start(entry);
    }

    return {
      accepted: true,
      submission: {
        cancel: () => this.cancel(entry),
        result,
      },
    };
  }

  cancelActive(): AnalysisCancellation {
    return this.active ? this.cancel(this.active) : { active: false };
  }

  close() {
    if (this.closed) {
      return;
    }
    this.closed = true;
    const error = new AnalysisQueueClosedError();
    const entries = this.active ? [this.active, ...this.pending] : [...this.pending];
    this.active = undefined;
    this.pending.length = 0;
    for (const entry of entries) {
      this.clearCancellationTimeout(entry);
      entry.state = 'settled';
      entry.reject(error);
    }
  }

  get hasActive() {
    return this.active !== undefined;
  }

  get pendingCount() {
    return this.pending.length;
  }

  private start(entry: AnalysisQueueEntry) {
    entry.state = 'active';
    this.active = entry;
    let execution: Promise<unknown>;
    try {
      execution = entry.run();
    } catch (error) {
      execution = Promise.reject(error);
    }
    void execution.then(
      result => this.complete(entry, () => entry.resolve(result)),
      error => this.complete(entry, () => entry.reject(error)),
    );
  }

  private complete(entry: AnalysisQueueEntry, settle: () => void) {
    if (entry.state !== 'active' || this.active !== entry) {
      return;
    }
    this.clearCancellationTimeout(entry);
    entry.state = 'settled';
    this.active = undefined;
    const next = this.pending.shift();
    if (next) {
      this.start(next);
    }
    settle();
  }

  private cancel(entry: AnalysisQueueEntry): AnalysisCancellation {
    if (entry.state === 'pending') {
      const index = this.pending.indexOf(entry);
      if (index !== -1) {
        this.pending.splice(index, 1);
      }
      entry.state = 'settled';
      entry.reject(new AnalysisRequestCancelledError());
      return { active: false };
    }
    if (entry.state !== 'active' || this.active !== entry) {
      return { active: false };
    }

    if (!entry.cancellationResult) {
      try {
        entry.cancellationResult = Promise.resolve(entry.requestCancellation());
      } catch (error) {
        entry.cancellationResult = Promise.reject(error);
      }
      if (this.cancellationTimeoutMs > 0) {
        entry.cancellationTimeout = setTimeout(() => {
          void Promise.resolve(this.onCancellationTimeout()).catch(() => {});
        }, this.cancellationTimeoutMs);
      }
    }
    return { active: true, result: entry.cancellationResult };
  }

  private clearCancellationTimeout(entry: AnalysisQueueEntry) {
    if (entry.cancellationTimeout) {
      clearTimeout(entry.cancellationTimeout);
      entry.cancellationTimeout = undefined;
    }
  }
}
