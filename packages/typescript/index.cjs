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
const supported = require('./supported-exports.json');
const { CompilerContractError } = require('./errors.cjs');
const { name: backend } = require('./selection.cjs')();
const provider = require('./registry.cjs')(backend);
const compiler = Object.create(null);
for (const name of supported) {
  if (provider[name] === undefined) {
    throw new CompilerContractError(
      `Compiler provider ${backend} does not implement typescript.${name}`,
    );
  }
  Object.defineProperty(compiler, name, {
    enumerable: true,
    get() {
      const value = provider[name];
      if (value === undefined)
        throw new CompilerContractError(`Compiler provider does not implement typescript.${name}`);
      return value;
    },
  });
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
