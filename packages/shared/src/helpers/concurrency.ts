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
export const DEFAULT_IO_CONCURRENCY = 16;

type ConcurrentMapOptions = {
  concurrency?: number;
  order?: 'input' | 'completion';
};

type Result<T> = { ok: true; value: T } | { ok: false };

/**
 * Lazily maps independent tasks, keeping at most `concurrency` started but unconsumed
 * tasks (including completed results). Input order is preserved by default.
 *
 * On failure or early consumer exit, no more work is scheduled and all started tasks
 * settle before the iterator exits. Mappers should return their results rather than
 * mutate state that requires input ordering; apply those updates in the consumer.
 */
export async function* mapConcurrent<T, R>(
  items: Iterable<T>,
  mapper: (item: T) => R | Promise<R>,
  { concurrency = DEFAULT_IO_CONCURRENCY, order = 'input' }: ConcurrentMapOptions = {},
): AsyncGenerator<R> {
  if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
    throw new RangeError('Concurrency must be a positive safe integer.');
  }

  const iterator = items[Symbol.iterator]();
  const pending = new Map<number, Promise<Result<R>>>();
  const completed: number[] = [];
  let notifyCompletion: (() => void) | undefined;
  let nextTask = 0;
  let nextResult = 0;
  let exhausted = false;
  let failed = false;
  let firstError: unknown;

  function complete(index: number) {
    if (order === 'completion') {
      completed.push(index);
      notifyCompletion?.();
      notifyCompletion = undefined;
    }
  }

  function fillWindow() {
    while (!exhausted && !failed && pending.size < concurrency) {
      const item = iterator.next();
      if (item.done) {
        exhausted = true;
        break;
      }
      const index = nextTask++;
      // Install rejection handlers before invoking the mapper, including synchronous throws.
      const result = Promise.resolve()
        .then(() => mapper(item.value))
        .then(
          value => {
            complete(index);
            return { ok: true, value } as const;
          },
          error => {
            if (!failed) {
              failed = true;
              firstError = error;
            }
            complete(index);
            return { ok: false } as const;
          },
        );
      pending.set(index, result);
    }
  }

  try {
    fillWindow();
    while (pending.size > 0) {
      let index: number;
      if (order === 'input') {
        index = nextResult++;
      } else {
        // Each task notifies once. Repeated Promise.race calls would accumulate
        // callbacks on a slow task as other tasks complete.
        while (completed.length === 0) {
          await new Promise<void>(resolve => {
            notifyCompletion = resolve;
          });
        }
        index = completed.shift()!;
      }
      const result = await pending.get(index)!;
      if (!result.ok || failed) {
        throw firstError;
      }
      pending.delete(index);
      yield result.value;
      // Refill only when the consumer requests another result (backpressure).
      fillWindow();
    }
  } finally {
    // This joins only the bounded window, never one promise per input item.
    await Promise.all(pending.values());
    iterator.return?.();
  }
}
