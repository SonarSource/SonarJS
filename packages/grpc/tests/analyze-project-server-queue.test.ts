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

import { setTimeout as delay } from 'node:timers/promises';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import {
  AnalysisQueueClosedError,
  AnalysisRequestCancelledError,
  AnalysisRequestQueue,
  type AnalysisQueueAdmission,
  type AnalysisQueueSubmission,
} from '../src/analyze-project-server-queue.js';

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function acceptedSubmission<T>(admission: AnalysisQueueAdmission<T>): AnalysisQueueSubmission<T> {
  if (!admission.accepted) {
    throw new Error(`Expected queue admission, got ${admission.reason}`);
  }
  return admission.submission;
}

describe('analyze-project request queue', () => {
  it('should run queued analyses in arrival order', async () => {
    const releases = [createDeferred<void>(), createDeferred<void>(), createDeferred<void>()];
    const started: number[] = [];
    const queue = new AnalysisRequestQueue();
    const submissions = releases.map((release, index) =>
      acceptedSubmission(
        queue.enqueue(
          async () => {
            started.push(index);
            await release.promise;
            return index;
          },
          async () => true,
        ),
      ),
    );

    expect(started).toEqual([0]);
    for (let index = 0; index < releases.length; index++) {
      releases[index].resolve();
      await submissions[index].result;
      expect(started).toEqual(Array.from({ length: index + 2 }, (_, i) => i).slice(0, 3));
    }
  });

  it('should remove a cancelled pending analysis', async () => {
    const activeRelease = createDeferred<void>();
    let pendingStarted = false;
    const queue = new AnalysisRequestQueue();
    const active = acceptedSubmission(
      queue.enqueue(
        () => activeRelease.promise,
        async () => true,
      ),
    );
    const pending = acceptedSubmission(
      queue.enqueue(
        async () => {
          pendingStarted = true;
        },
        async () => true,
      ),
    );

    expect(pending.cancel()).toEqual({ active: false });
    await expect(pending.result).rejects.toBeInstanceOf(AnalysisRequestCancelledError);
    activeRelease.resolve();
    await active.result;

    expect(pendingStarted).toBe(false);
    expect(queue.pendingCount).toBe(0);
  });

  it('should reject admission when the pending queue is full', async () => {
    const activeRelease = createDeferred<void>();
    const queue = new AnalysisRequestQueue(1);
    const active = acceptedSubmission(
      queue.enqueue(
        () => activeRelease.promise,
        async () => true,
      ),
    );
    const pending = acceptedSubmission(
      queue.enqueue(
        async () => {},
        async () => true,
      ),
    );

    expect(
      queue.enqueue(
        async () => {},
        async () => true,
      ),
    ).toEqual({
      accepted: false,
      reason: 'full',
    });
    activeRelease.resolve();
    await Promise.all([active.result, pending.result]);
  });

  it('should reject active and pending analyses when the queue closes', async () => {
    const queue = new AnalysisRequestQueue();
    const active = acceptedSubmission(
      queue.enqueue(
        () => new Promise<void>(() => {}),
        async () => true,
      ),
    );
    const pending = acceptedSubmission(
      queue.enqueue(
        async () => {},
        async () => true,
      ),
    );
    const activeResult = expect(active.result).rejects.toBeInstanceOf(AnalysisQueueClosedError);
    const pendingResult = expect(pending.result).rejects.toBeInstanceOf(AnalysisQueueClosedError);

    queue.close();

    await Promise.all([activeResult, pendingResult]);
    expect(
      queue.enqueue(
        async () => {},
        async () => true,
      ),
    ).toEqual({
      accepted: false,
      reason: 'closed',
    });
  });

  it('should report when a cancelled analysis does not finish', async () => {
    const cancellationGraceExceeded = createDeferred<void>();
    const activeRelease = createDeferred<void>();
    let cancellationRequests = 0;
    const queue = new AnalysisRequestQueue(1, 5, () => cancellationGraceExceeded.resolve());
    const active = acceptedSubmission(
      queue.enqueue(
        () => activeRelease.promise,
        async () => {
          cancellationRequests += 1;
          return true;
        },
      ),
    );

    const firstCancellation = active.cancel();
    const secondCancellation = active.cancel();
    expect(firstCancellation.active).toBe(true);
    expect(secondCancellation.active).toBe(true);
    await Promise.race([
      cancellationGraceExceeded.promise,
      delay(1_000).then(() => {
        throw new Error('Timed out waiting for cancellation grace period');
      }),
    ]);
    activeRelease.resolve();
    await active.result;

    expect(cancellationRequests).toBe(1);
  });

  it('should report when cancellation is not acknowledged', async () => {
    const cancellationFailure = createDeferred<void>();
    const activeRelease = createDeferred<void>();
    const queue = new AnalysisRequestQueue(1, 1_000, () => cancellationFailure.resolve());
    const active = acceptedSubmission(
      queue.enqueue(
        () => activeRelease.promise,
        async () => false,
      ),
    );

    active.cancel();
    await Promise.race([
      cancellationFailure.promise,
      delay(100).then(() => {
        throw new Error('Timed out waiting for cancellation failure');
      }),
    ]);
    activeRelease.resolve();
    await active.result;
  });
});
