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
// Every consumer, including upstream rules and helpers, resolves this same contract.
// A provider supplies the supported operations; it does not determine the public export surface.
const { entries, assertMembers } = require('./contract.cjs');
const { CompilerContractError } = require('./errors.cjs');
const { implementation, metadata, trackProgram } = require('./selected-provider.cjs');
const provider = implementation.compiler;
const compiler = Object.create(null);
for (const { name, kind, capability } of entries) {
  if (capability && !metadata.capabilities[capability]) {
    const unsupported = () => {
      throw new CompilerContractError(
        `Compiler provider ${metadata.name} does not support ${capability} (${name})`,
      );
    };
    compiler[name] =
      kind === 'function' ? unsupported : new Proxy(Object.create(null), { get: unsupported });
    continue;
  }
  const value = provider[name];
  if (typeof value !== kind || value === null) {
    throw new CompilerContractError(
      `Compiler provider ${metadata.name} does not implement typescript.${name} (${kind})`,
    );
  }
  if (name === 'factory' || name === 'sys') assertMembers(value, name);
  // The selected provider is fixed for this worker. Capture each binding once.
  compiler[name] =
    name === 'createProgram'
      ? (...args) => assertMembers(trackProgram(value(...args)), 'Program')
      : name === 'createSemanticDiagnosticsBuilderProgram'
        ? (...args) => {
            const builder = assertMembers(value(...args), 'BuilderProgram');
            assertMembers(trackProgram(builder.getProgram()), 'Program');
            return builder;
          }
        : value;
}
module.exports = new Proxy(Object.freeze(compiler), {
  get(target, name) {
    // Module interop probes are not compiler operations.
    if (typeof name === 'symbol' || name === '__esModule' || name === 'then') return undefined;
    if (!Object.hasOwn(target, name))
      throw new CompilerContractError(`Unsupported SonarJS compiler operation: typescript.${name}`);
    return target[name];
  },
});
