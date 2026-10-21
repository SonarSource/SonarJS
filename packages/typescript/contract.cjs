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
const specification = require('./contract.json');
const { CompilerContractError } = require('./errors.cjs');
const optional = Object.entries(specification.optional).flatMap(
  ([capability, { kind, exports: names }]) => names.map(name => ({ name, capability, kind })),
);
const entries = [
  ...specification.constants.map(name => ({ name, kind: 'object' })),
  ...specification.syntax.map(name => ({ name, kind: 'function' })),
  ...specification.operations.map(name => ({ name, kind: 'function' })),
  ...Object.keys(specification.objects).map(name => ({ name, kind: 'object' })),
  ...specification.strings.map(name => ({ name, kind: 'string' })),
  ...optional,
].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
const names = entries.map(entry => entry.name);
if (new Set(names).size !== names.length)
  throw new CompilerContractError('Duplicate compiler contract export');

/** Validate one object at its creation boundary, without wrapping hot query paths. */
const validated = new Map();
function assertMembers(value, category) {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function')
    throw new CompilerContractError(`Compiler provider did not return ${category}`);
  let checked = validated.get(category);
  if (!checked) validated.set(category, (checked = new WeakSet()));
  if (checked.has(value)) return value;
  for (const name of specification.members[category]) {
    if (typeof value?.[name] !== 'function')
      throw new CompilerContractError(`Compiler provider does not implement ${category}.${name}`);
  }
  for (const [name, kind] of Object.entries(specification.properties[category] ?? {})) {
    if (typeof value[name] !== kind || value[name] === null)
      throw new CompilerContractError(
        `Compiler provider does not implement ${category}.${name} (${kind})`,
      );
  }
  checked.add(value);
  return value;
}

/** Providers have explicit resource ownership even when their SDK needs no cleanup. */
function defineProvider(provider) {
  if (!provider || typeof provider.compiler !== 'object' || provider.compiler === null)
    throw new CompilerContractError('Compiler provider must supply its compiler bindings');
  if (typeof provider.compilerVersion !== 'string' || !provider.compilerVersion)
    throw new CompilerContractError('Compiler provider must report its compilerVersion');
  if (typeof provider.ownsProgramResources !== 'boolean')
    throw new CompilerContractError('Compiler provider must declare ownsProgramResources');
  for (const name of ['disposeProgram', 'close']) {
    if (typeof provider[name] !== 'function')
      throw new CompilerContractError(`Compiler provider does not implement lifecycle.${name}`);
  }
  return provider;
}

const operations = [
  ...specification.operations,
  ...Object.keys(specification.objects).filter(name => specification.objects[name] === 'provider'),
  ...optional.map(entry => entry.name),
].sort();
module.exports = { specification, entries, names, operations, assertMembers, defineProvider };
