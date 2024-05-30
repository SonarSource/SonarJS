import { runTest } from '../../test';

const code = `function loadAll(pluginNames) {
  pluginNames.foo(); // Noncompliant: pluginNames might be undefined
}

loadAll();`;

runTest('t01-09', code);
