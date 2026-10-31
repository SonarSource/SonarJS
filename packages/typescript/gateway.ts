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
import { createRequire, registerHooks } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TypeScriptFailure } from './errors.cjs';
import {
  compilerEntry,
  supportedRoot,
  metadataEntry,
  controlEntries,
  findCompilerRoot,
} from './boundary.cjs';
export { TypeScriptFailure } from './errors.cjs';

/** Shared TypeScript-compatible module provider ABI for every consumer.
 * Implementations must supply compiler-shaped objects from the selected backend. */
export interface CompilerProvider {
  readonly name: string;
  readonly exports: Readonly<Record<string, unknown>>;
  readonly packageMetadata: { readonly name: string; readonly version: string };
  /** Only compiler implementation code may bypass its own dependency facade. */
  readonly implementationRoots: readonly string[];
  readonly assertHealthy?: () => void;
}

export interface CompilerGateway {
  readonly provider: string;
  readonly facade: Readonly<Record<string, unknown>>;
  assertHealthy(): void;
  observations(): readonly { readonly importer: string; readonly specifier: string }[];
}

const require = createRequire(__filename);
const virtualModule = 'sonarjs-typescript:dependency-facade';
const metadataModule = 'sonarjs-typescript:dependency-metadata';
const registry = Symbol.for('sonarjs.typescript.dependency-gateway.v1');
let installed: { provider: CompilerProvider; gateway: CompilerGateway } | undefined;

/** One provider per module cache/worker. Never mutate the binding after imports run. */
export function installCompilerGateway(provider: CompilerProvider): CompilerGateway {
  if (installed) {
    if (installed.provider !== provider)
      throw new TypeScriptFailure(
        'backend',
        `Compiler gateway is already bound to ${installed.provider.name}; use a separate worker for ${provider.name}`,
      );
    return installed.gateway;
  }
  let failure: TypeScriptFailure | undefined;
  const observations = new Map<string, { importer: string; specifier: string }>();
  const fail = (message: string, operation: string): never => {
    failure ??= new TypeScriptFailure('unsupported-operation', message, operation);
    throw failure;
  };
  const healthy = () => {
    if (failure) throw failure;
    provider.assertHealthy?.();
  };
  const roots = provider.implementationRoots.map(
    root => pathToFileURL(path.resolve(root) + path.sep).href,
  );
  const implementation = (url: string) => roots.some(root => url.startsWith(root));
  const packageCache = new Map<string, string | undefined>();
  const compilerRoot = (url: string): string | undefined => {
    return url.startsWith('file:')
      ? findCompilerRoot(fileURLToPath(url), packageCache, __dirname)
      : undefined;
  };
  // Installing a hook cannot repair compiler bindings already retained in CJS modules.
  for (const module of Object.values(require.cache)) {
    if (!module || implementation(pathToFileURL(module.filename).href)) continue;
    if (module.children.some(child => compilerRoot(pathToFileURL(child.filename).href)))
      throw new TypeScriptFailure(
        'backend',
        `Install the compiler gateway before loading ${module.filename}`,
      );
  }
  const target = Object.create(null) as Record<string, unknown>;
  const functionCache = new Map<string, unknown>();
  const rethrow = (error: unknown): never => {
    // Source/parser errors remain recoverable; gateway failures are sticky.
    if (error instanceof TypeScriptFailure) failure ??= error;
    throw error;
  };
  const names = Object.getOwnPropertyNames(provider.exports);
  for (const name of names.filter(name => !['default', '__esModule'].includes(name)))
    Object.defineProperty(target, name, {
      enumerable: true,
      get() {
        healthy();
        const cached = functionCache.get(name);
        if (cached) return cached;
        const value = provider.exports[name];
        if (typeof value !== 'function') return value;
        const wrapped = new Proxy(value, {
          apply(target, _this, args) {
            healthy();
            try {
              return Reflect.apply(target, provider.exports, args);
            } catch (error) {
              return rethrow(error);
            }
          },
          construct(target, args, newTarget) {
            healthy();
            try {
              return Reflect.construct(target, args, newTarget) as object;
            } catch (error) {
              return rethrow(error);
            }
          },
        });
        functionCache.set(name, wrapped);
        return wrapped;
      },
    });
  const facade = new Proxy(Object.freeze(target), {
    get(target, key, receiver) {
      healthy();
      // Interop probes are not compiler operations.
      // Preserve this proxy through TypeScript's __importStar/__importDefault;
      // copying the exports to a plain object would hide unsupported accesses.
      if (key === '__esModule') return true;
      if (key === 'default') return receiver;
      if (typeof key === 'symbol') return Reflect.get(target, key, receiver);
      if (!Object.hasOwn(target, key))
        return fail(`Compiler provider ${provider.name} does not implement ${key}`, key);
      return Reflect.get(target, key, receiver);
    },
  });
  const gateway: CompilerGateway = Object.freeze({
    provider: provider.name,
    facade,
    assertHealthy: healthy,
    observations: () =>
      Object.freeze([...observations.values()].map(value => Object.freeze({ ...value }))),
  });
  // Synchronous ESM can be loaded by Node 24 require as well as import. A custom
  // URL prevents transpiler require hooks from looking for a physical JS file.
  const hints = names
    .filter(name => /^[A-Za-z_$][\w$]*$/.test(name) && !['default', '__esModule'].includes(name))
    .map((name, i) => `const v${i}=facade[${JSON.stringify(name)}];export {v${i} as ${name}};`)
    .join('\n');
  const source = `const facade=globalThis[Symbol.for(${JSON.stringify(Symbol.keyFor(registry))})].facade;\nexport default facade;export {facade as 'module.exports'};\n${hints}`;
  const metadataSource = `const metadata=Object.freeze(${JSON.stringify(provider.packageMetadata)});export default metadata;export {metadata as 'module.exports'};`;
  registerHooks({
    resolve(specifier, context, next) {
      if (specifier === virtualModule || specifier === metadataModule)
        return { url: specifier, shortCircuit: true };
      const parent = context.parentURL ?? '';
      if (implementation(parent)) return next(specifier, context);
      if (controlEntries.has(specifier)) {
        const file =
          specifier === 'typescript/errors'
            ? 'errors.cjs'
            : context.conditions.includes('require')
              ? 'control.cjs'
              : 'control.mjs';
        return next(pathToFileURL(path.join(__dirname, file)).href, context);
      }
      if (compilerEntry.test(specifier)) {
        healthy();
        observations.set(`${parent}:${specifier}`, { importer: parent, specifier });
        if (metadataEntry.test(specifier)) return { url: metadataModule, shortCircuit: true };
        if (!supportedRoot.test(specifier))
          return fail(
            `Unsupported dependency compiler entry: ${specifier} from ${parent}`,
            specifier,
          );
        return { url: virtualModule, shortCircuit: true };
      }
      const resolved = next(specifier, context);
      // Detect nested copies, npm aliases and absolute/relative compiler imports.
      const resolvedCompiler = compilerRoot(resolved.url);
      if (resolvedCompiler && resolvedCompiler !== compilerRoot(parent))
        return fail(`Dependency bypasses compiler gateway: ${specifier} from ${parent}`, specifier);
      return resolved;
    },
    load(url, context, next) {
      if (url === virtualModule) return { format: 'module', source, shortCircuit: true };
      if (url === metadataModule)
        return { format: 'module', source: metadataSource, shortCircuit: true };
      return next(url, context);
    },
  });
  Object.defineProperty(globalThis, registry, {
    value: gateway,
    configurable: false,
    writable: false,
  });
  installed = { provider, gateway };
  return gateway;
}
