import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertCompilerRouting } from './routing.mjs';

test('routing requires one healthy facade and both application/dependency observations', () => {
  const compiler = {};
  const observations = [
    { importer: 'file:///repo/packages/analysis/src/program.ts', specifier: 'typescript' },
    {
      importer: 'file:///repo/node_modules/@typescript-eslint/parser/index.js',
      specifier: 'typescript',
    },
  ];
  const gateway = {
    facade: compiler,
    provider: 'ts7',
    assertHealthy() {},
    observations: () => observations,
  };
  assert.equal(assertCompilerRouting(gateway, compiler).sameFacade, true);
  assert.throws(() => assertCompilerRouting(gateway, {}), /sameFacade=false/);
  assert.throws(
    () => assertCompilerRouting({ ...gateway, observations: () => [] }, compiler),
    /application=0/,
  );
  const failure = new Error('caught compiler escape');
  assert.throws(
    () =>
      assertCompilerRouting(
        {
          ...gateway,
          assertHealthy() {
            throw failure;
          },
        },
        compiler,
      ),
    error => error === failure,
  );
});
