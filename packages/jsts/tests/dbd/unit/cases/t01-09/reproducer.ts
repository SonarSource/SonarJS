import { runTest } from '../../test';

const code = `function loadAll(pluginNames) {
  pluginNames.foo(); // Noncompliant: pluginNames might be undefined
}

loadAll(5);
loadAll();

{
  function loadAll(pluginNames) {
    pluginNames.foo(); // Noncompliant: pluginNames might be undefined
  }
  
  loadAll();
}
`;

runTest('t01-09', code);
