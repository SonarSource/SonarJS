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
const { defineProvider, specification } = require('./contract.cjs');
const { CompilerContractError } = require('./errors.cjs');
const { AsyncLocalStorage } = require('node:async_hooks');
const selected = require('./selection.cjs')();
const capabilities = Object.freeze(
  Object.fromEntries(
    Object.keys(specification.optional).map(name => {
      const value = selected.capabilities?.[name];
      if (typeof value !== 'boolean')
        throw new CompilerContractError(
          `Compiler provider ${selected.name} must declare capability ${name}`,
        );
      return [name, value];
    }),
  ),
);
const implementation = defineProvider(require('./registry.cjs')(selected.name));
const metadata = Object.freeze({
  name: selected.name,
  contractVersion: specification.version,
  compilerVersion: implementation.compilerVersion,
  capabilities,
});
const disposed = new WeakSet();
const scopes = new AsyncLocalStorage();
function trackProgram(program) {
  if (implementation.ownsProgramResources) scopes.getStore()?.add(program);
  return program;
}
function disposeProgram(program) {
  if (!program || disposed.has(program)) return;
  implementation.disposeProgram(program);
  disposed.add(program);
}
function close() {
  implementation.close();
}
async function withProgramScope(operation) {
  if (!implementation.ownsProgramResources) return operation();
  return scopes.run(new Set(), async () => {
    let failed = false;
    try {
      return await operation();
    } catch (error) {
      failed = true;
      throw error;
    } finally {
      const errors = [];
      for (const program of scopes.getStore()) {
        try {
          disposeProgram(program);
        } catch (error) {
          errors.push(error);
        }
      }
      // Preserve the analysis failure, while still attempting every release.
      if (!failed && errors.length)
        throw new AggregateError(errors, 'Compiler program cleanup failed');
    }
  });
}
module.exports = {
  implementation,
  metadata,
  disposeProgram,
  close,
  trackProgram,
  withProgramScope,
};
