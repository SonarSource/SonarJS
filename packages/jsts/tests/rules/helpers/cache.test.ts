/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { ComputedCache } from '../../../src/rules/helpers/cache.js';

describe('ComputedCache', () => {
  describe('constructor', () => {
    test('should create an empty cache', () => {
      const cache = new ComputedCache((key: string) => key.length);
      assert.strictEqual(cache.size, 0);
    });

    test('should store the compute function', () => {
      const computeFn = (key: string) => key.length;
      const cache = new ComputedCache(computeFn);
      assert.ok(cache);
    });
  });

  describe('get', () => {
    test('should compute and cache value for new key', () => {
      let computeCallCount = 0;
      const cache = new ComputedCache((key: string) => {
        computeCallCount++;
        return key.length;
      });

      const result = cache.get('test');

      assert.strictEqual(result, 4);
      assert.strictEqual(computeCallCount, 1);
      assert.strictEqual(cache.has('test'), true);
    });

    test('should return cached value for existing key without recomputing', () => {
      let computeCallCount = 0;
      const cache = new ComputedCache((key: string) => {
        computeCallCount++;
        return key.length;
      });

      const result1 = cache.get('test');
      const result2 = cache.get('test');

      assert.strictEqual(result1, 4);
      assert.strictEqual(result2, 4);
      assert.strictEqual(computeCallCount, 1);
    });

    test('should pass context to compute function', () => {
      interface Context {
        multiplier: number;
      }
      let receivedKey: string | undefined;
      let receivedContext: Context | undefined;

      const cache = new ComputedCache<string, number, Context>((key, context) => {
        receivedKey = key;
        receivedContext = context;
        return key.length * (context?.multiplier || 1);
      });

      const context = { multiplier: 2 };
      const result = cache.get('test', context);

      assert.strictEqual(result, 8);
      assert.strictEqual(receivedKey, 'test');
      assert.deepStrictEqual(receivedContext, context);
    });

    test('should handle different key types', () => {
      const cache = new ComputedCache<number, string>(key => `value-${key}`);

      const result = cache.get(123);

      assert.strictEqual(result, 'value-123');
    });

    test('should handle null and undefined keys', () => {
      const cache = new ComputedCache<string | null | undefined, string>(key => `value-${key}`);

      const nullResult = cache.get(null);
      const undefinedResult = cache.get(undefined);

      assert.strictEqual(nullResult, 'value-null');
      assert.strictEqual(undefinedResult, 'value-undefined');
    });

    test('should compute different values for different keys', () => {
      const cache = new ComputedCache((key: string) => key.toUpperCase());

      const result1 = cache.get('hello');
      const result2 = cache.get('world');

      assert.strictEqual(result1, 'HELLO');
      assert.strictEqual(result2, 'WORLD');
      assert.strictEqual(cache.size, 2);
    });
  });

  describe('set', () => {
    test('should set value directly in cache', () => {
      let computeCallCount = 0;
      const cache = new ComputedCache((key: string) => {
        computeCallCount++;
        return key.length;
      });

      cache.set('test', 123);

      assert.strictEqual(cache.get('test'), 123);
      assert.strictEqual(cache.has('test'), true);
      assert.strictEqual(computeCallCount, 0);
    });

    test('should overwrite existing cached value', () => {
      const cache = new ComputedCache((key: string) => key.length);

      // First get to populate cache
      cache.get('test');
      assert.strictEqual(cache.get('test'), 4);

      // Set new value
      cache.set('test', 84);
      assert.strictEqual(cache.get('test'), 84);
    });

    test('should increase cache size', () => {
      const cache = new ComputedCache((key: string) => key.length);

      cache.set('key1', 1);
      assert.strictEqual(cache.size, 1);

      cache.set('key2', 2);
      assert.strictEqual(cache.size, 2);
    });
  });

  describe('has', () => {
    test('should return false for non-existent key', () => {
      const cache = new ComputedCache((key: string) => key.length);
      assert.strictEqual(cache.has('non-existent'), false);
    });

    test('should return true for existing key set directly', () => {
      const cache = new ComputedCache((key: string) => key.length);
      cache.set('test', 42);

      assert.strictEqual(cache.has('test'), true);
    });

    test('should return true for computed key', () => {
      const cache = new ComputedCache((key: string) => key.length);

      cache.get('test');

      assert.strictEqual(cache.has('test'), true);
    });

    test('should return false after key is deleted', () => {
      const cache = new ComputedCache((key: string) => key.length);
      cache.set('test', 42);

      cache.delete('test');

      assert.strictEqual(cache.has('test'), false);
    });
  });

  describe('delete', () => {
    test('should return false for non-existent key', () => {
      const cache = new ComputedCache((key: string) => key.length);

      const result = cache.delete('non-existent');

      assert.strictEqual(result, false);
    });

    test('should return true and remove existing key', () => {
      const cache = new ComputedCache((key: string) => key.length);
      cache.set('test', 42);

      const result = cache.delete('test');

      assert.strictEqual(result, true);
      assert.strictEqual(cache.has('test'), false);
      assert.strictEqual(cache.size, 0);
    });

    test('should allow recomputation after deletion', () => {
      let computeCallCount = 0;
      const values = [42, 84];
      const cache = new ComputedCache((_key: string) => {
        return values[computeCallCount++];
      });

      // First computation
      const result1 = cache.get('test');
      assert.strictEqual(result1, 42);
      assert.strictEqual(cache.get('test'), 42); // Should use cached value

      // Delete and recompute
      cache.delete('test');
      const result2 = cache.get('test');

      assert.strictEqual(result2, 84);
      assert.strictEqual(computeCallCount, 2);
    });

    test('should decrease cache size', () => {
      const cache = new ComputedCache((key: string) => key.length);
      cache.set('key1', 1);
      cache.set('key2', 2);
      assert.strictEqual(cache.size, 2);

      cache.delete('key1');
      assert.strictEqual(cache.size, 1);
    });
  });

  describe('clear', () => {
    test('should remove all entries from cache', () => {
      const cache = new ComputedCache((key: string) => key.length);
      cache.set('key1', 1);
      cache.set('key2', 2);
      cache.set('key3', 3);

      cache.clear();

      assert.strictEqual(cache.size, 0);
      assert.strictEqual(cache.has('key1'), false);
      assert.strictEqual(cache.has('key2'), false);
      assert.strictEqual(cache.has('key3'), false);
    });

    test('should allow recomputation after clear', () => {
      let computeCallCount = 0;
      const cache = new ComputedCache((key: string) => {
        computeCallCount++;
        return key.length;
      });

      cache.get('test');
      cache.clear();
      cache.get('test');

      assert.strictEqual(computeCallCount, 2);
    });

    test('should work on empty cache', () => {
      const cache = new ComputedCache((key: string) => key.length);

      cache.clear();

      assert.strictEqual(cache.size, 0);
    });
  });

  describe('size', () => {
    test('should return 0 for empty cache', () => {
      const cache = new ComputedCache((key: string) => key.length);
      assert.strictEqual(cache.size, 0);
    });

    test('should return correct size after adding entries', () => {
      const cache = new ComputedCache((key: string) => key.length);

      cache.set('key1', 1);
      assert.strictEqual(cache.size, 1);

      cache.set('key2', 2);
      assert.strictEqual(cache.size, 2);
    });

    test('should return correct size after computing entries', () => {
      const cache = new ComputedCache((key: string) => key.length);

      cache.get('key1');
      assert.strictEqual(cache.size, 1);

      cache.get('key2');
      assert.strictEqual(cache.size, 2);

      // Getting same key shouldn't increase size
      cache.get('key1');
      assert.strictEqual(cache.size, 2);
    });

    test('should update size after deletion', () => {
      const cache = new ComputedCache((key: string) => key.length);
      cache.set('key1', 1);
      cache.set('key2', 2);
      assert.strictEqual(cache.size, 2);

      cache.delete('key1');
      assert.strictEqual(cache.size, 1);
    });

    test('should be 0 after clear', () => {
      const cache = new ComputedCache((key: string) => key.length);
      cache.set('key1', 1);
      cache.set('key2', 2);

      cache.clear();

      assert.strictEqual(cache.size, 0);
    });
  });

  describe('with context type', () => {
    test('should work with typed context', () => {
      interface TestContext {
        multiplier: number;
        prefix: string;
      }

      let receivedContext: TestContext | undefined;
      const cache = new ComputedCache<string, string, TestContext>((key, context) => {
        receivedContext = context;
        return `${context?.prefix || ''}${key}${context?.multiplier || ''}`;
      });

      const context: TestContext = { multiplier: 2, prefix: 'cached-' };
      const result = cache.get('test', context);

      assert.strictEqual(result, 'cached-test2');
      assert.deepStrictEqual(receivedContext, context);
    });

    test('should work without context', () => {
      interface TestContext {
        multiplier: number;
      }

      const cache = new ComputedCache<string, number, TestContext>((key, context) => {
        return key.length * (context?.multiplier || 1);
      });

      const result = cache.get('test');

      assert.strictEqual(result, 4);
    });
  });

  describe('edge cases', () => {
    test('should handle undefined return value from compute function', () => {
      const cache = new ComputedCache<string, undefined>(() => undefined);

      const result = cache.get('test');

      assert.strictEqual(result, undefined);
      assert.strictEqual(cache.has('test'), true);
    });

    test('should handle null return value from compute function', () => {
      const cache = new ComputedCache<string, null>(() => null);

      const result = cache.get('test');

      assert.strictEqual(result, null);
      assert.strictEqual(cache.has('test'), true);
    });

    test('should work with object keys', () => {
      const cache = new ComputedCache<object, string>(key => JSON.stringify(key));
      const keyObj = { id: 1, name: 'test' };

      const result = cache.get(keyObj);

      assert.strictEqual(result, '{"id":1,"name":"test"}');
    });

    test('should handle complex values', () => {
      const cache = new ComputedCache<string, { result: number; timestamp: number }>(key => ({
        result: key.length,
        timestamp: Date.now(),
      }));

      const result = cache.get('test');

      assert.strictEqual(result.result, 4);
      assert.ok(typeof result.timestamp === 'number');
    });
  });

  describe('performance characteristics', () => {
    test('should not recompute for repeated access', () => {
      let computeCallCount = 0;
      const cache = new ComputedCache((key: string) => {
        computeCallCount++;
        // Simulate expensive computation
        return key.split('').reverse().join('');
      });

      const key = 'expensive-computation';

      // Multiple accesses
      for (let i = 0; i < 100; i++) {
        cache.get(key);
      }

      assert.strictEqual(computeCallCount, 1);
      assert.strictEqual(cache.get(key), 'noitatupmoc-evisnepxe');
    });
  });
});
