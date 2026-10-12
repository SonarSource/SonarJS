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
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { mapConcurrent } from '../../src/helpers/concurrency.js';

async function collect<T>(items: AsyncIterable<T>): Promise<T[]> {
  const results: T[] = [];
  for await (const item of items) {
    results.push(item);
  }
  return results;
}

describe('mapConcurrent', () => {
  it('preserves input order when tasks finish in reverse order', async () => {
    const gates = Array.from({ length: 4 }, () => Promise.withResolvers<number>());
    const results = collect(mapConcurrent([0, 1, 2, 3], i => gates[i].promise, { concurrency: 4 }));
    await nextTurn();
    for (let i = 3; i >= 0; i--) {
      gates[i].resolve(i);
    }
    assert.deepEqual(await results, [0, 1, 2, 3]);
  });

  it('bounds completed results behind a slow first task and does not read ahead', async () => {
    let pulled = 0;
    let closed = false;
    function* inputs() {
      try {
        for (let i = 0; i < 1000; i++) {
          pulled++;
          yield i;
        }
      } finally {
        closed = true;
      }
    }
    const first = Promise.withResolvers<number>();
    const iterator = mapConcurrent(inputs(), i => (i === 0 ? first.promise : i), {
      concurrency: 3,
    });
    const next = iterator.next();
    await nextTurn();
    assert.equal(pulled, 3);
    first.resolve(0);
    assert.deepEqual(await next, { value: 0, done: false });
    await nextTurn();
    assert.equal(pulled, 3); // The consumer has not requested another result.
    await iterator.return(undefined);
    assert.equal(closed, true);
    assert.equal(pulled, 3);
  });

  it('emits completion order without stalling behind an earlier task', async () => {
    let pulled = 0;
    const first = Promise.withResolvers<number>();
    function* inputs() {
      for (let i = 0; i < 1000; i++) {
        pulled++;
        yield i;
      }
    }
    const iterator = mapConcurrent(inputs(), i => (i === 0 ? first.promise : i), {
      concurrency: 2,
      order: 'completion',
    });
    for (let i = 1; i < 1000; i++) {
      assert.deepEqual(await iterator.next(), { value: i, done: false });
      assert.ok(pulled - i <= 2);
    }
    first.resolve(0);
    assert.deepEqual(await iterator.next(), { value: 0, done: false });
    assert.equal((await iterator.next()).done, true);
  });

  for (const order of ['input', 'completion'] as const) {
    it(`stops scheduling and drains started tasks on failure (${order})`, async () => {
      const gates = Array.from({ length: 3 }, () => Promise.withResolvers<number>());
      const started: number[] = [];
      const failure = new Error('read failed');
      let finished = false;
      const results = collect(
        mapConcurrent(
          [0, 1, 2, 3, 4],
          i => {
            started.push(i);
            return gates[i].promise;
          },
          { concurrency: 3, order },
        ),
      );
      // Attach the rejection handler immediately; failing tasks must never be unhandled.
      const rejection = assert
        .rejects(results, error => error === failure)
        .then(() => {
          finished = true;
        });
      await nextTurn();
      gates[2].reject(failure);
      gates[0].resolve(0);
      await nextTurn();
      assert.equal(finished, false);
      assert.deepEqual(started, [0, 1, 2]);
      gates[1].resolve(1);
      await rejection;
      assert.deepEqual(started, [0, 1, 2]);
    });

    it(`drains tasks and closes the input iterator on consumer exit (${order})`, async () => {
      const pending = Promise.withResolvers<number>();
      let pulled = 0;
      let closed = false;
      let finished = false;
      function* inputs() {
        try {
          for (let i = 0; i < 100; i++) {
            pulled++;
            yield i;
          }
        } finally {
          closed = true;
        }
      }
      const run = (async () => {
        for await (const result of mapConcurrent(inputs(), i => (i === 0 ? 0 : pending.promise), {
          concurrency: 2,
          order,
        })) {
          assert.equal(result, 0);
          break;
        }
        finished = true;
      })();
      await nextTurn();
      assert.equal(pulled, 2);
      assert.equal(finished, false);
      pending.resolve(1);
      await run;
      assert.equal(closed, true);
      assert.equal(pulled, 2);
    });
  }

  it('drains started work if reading the input iterator throws', async () => {
    const gate = Promise.withResolvers<number>();
    const failure = new Error('input failed');
    function* inputs() {
      yield 0;
      throw failure;
    }
    let finished = false;
    const rejection = assert
      .rejects(collect(mapConcurrent(inputs(), () => gate.promise)), error => error === failure)
      .then(() => {
        finished = true;
      });
    await nextTurn();
    assert.equal(finished, false);
    gate.resolve(0);
    await rejection;
  });

  it('propagates synchronous mapper throws and undefined rejections', async () => {
    const failure = new Error('mapper failed');
    await assert.rejects(
      collect(
        mapConcurrent([1], () => {
          throw failure;
        }),
      ),
      error => error === failure,
    );
    await collect(mapConcurrent([1], () => Promise.reject(undefined))).then(
      () => assert.fail('Expected rejection'),
      error => assert.equal(error, undefined),
    );
  });

  it('supports empty inputs, synchronous mappers, and undefined results', async () => {
    assert.deepEqual(await collect(mapConcurrent([], () => assert.fail('Unexpected task'))), []);
    assert.deepEqual(await collect(mapConcurrent([1, 2], n => n * 2)), [2, 4]);
    assert.deepEqual(await collect(mapConcurrent([1, 2], () => undefined)), [undefined, undefined]);
  });

  it('rejects invalid concurrency limits before consuming input', async () => {
    for (const concurrency of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      await assert.rejects(mapConcurrent([1], n => n, { concurrency }).next(), RangeError);
    }
  });
});
