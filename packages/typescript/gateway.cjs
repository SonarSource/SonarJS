// Generated from gateway.ts by tools/generate-typescript-module.mjs.
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all) __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if ((from && typeof from === 'object') || typeof from === 'function') {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, {
          get: () => from[key],
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
        });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (
  (target = mod != null ? __create(__getProtoOf(mod)) : {}),
  __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule
      ? __defProp(target, 'default', { value: mod, enumerable: true })
      : target,
    mod,
  )
);
var __toCommonJS = mod => __copyProps(__defProp({}, '__esModule', { value: true }), mod);
var stdin_exports = {};
__export(stdin_exports, {
  TypeScriptFailure: () => import_errors2.TypeScriptFailure,
  installCompilerGateway: () => installCompilerGateway,
});
module.exports = __toCommonJS(stdin_exports);
var import_node_module = require('node:module');
var import_node_fs = require('node:fs');
var import_node_path = __toESM(require('node:path'));
var import_node_url = require('node:url');
var import_errors = require('./errors.cjs');
var import_errors2 = require('./errors.cjs');
const require2 = (0, import_node_module.createRequire)(__filename);
const virtualModule = 'sonarjs-typescript:dependency-facade';
const metadataModule = 'sonarjs-typescript:dependency-metadata';
const registry = /* @__PURE__ */ Symbol.for('sonarjs.typescript.dependency-gateway.v1');
let installed;
const normalized = url => url.replaceAll('\\', '/');
const dependency = url => /\/node_modules\//i.test(normalized(url));
const compilerEntry =
  /^(?:typescript|typescript-classic|@typescript\/(?:native-preview|api))(?:\/|$)/;
const compilerPackageNames = /* @__PURE__ */ new Set([
  'typescript',
  '@typescript/native-preview',
  '@typescript/api',
]);
function installCompilerGateway(provider) {
  if (installed) {
    if (installed.provider !== provider)
      throw new import_errors.TypeScriptFailure(
        'backend',
        `Compiler gateway is already bound to ${installed.provider.name}; use a separate worker for ${provider.name}`,
      );
    return installed.gateway;
  }
  let failure;
  const observations = /* @__PURE__ */ new Map();
  const fail = (message, operation) => {
    failure ??= new import_errors.TypeScriptFailure('unsupported-operation', message, operation);
    throw failure;
  };
  const healthy = () => {
    if (failure) throw failure;
    provider.assertHealthy?.();
  };
  const roots = provider.implementationRoots.map(
    root =>
      (0, import_node_url.pathToFileURL)(
        import_node_path.default.resolve(root) + import_node_path.default.sep,
      ).href,
  );
  const implementation = url => roots.some(root => url.startsWith(root));
  const packageCache = /* @__PURE__ */ new Map();
  const compilerRoot = url => {
    if (!url.startsWith('file:') || !dependency(url)) return void 0;
    let directory = import_node_path.default.dirname((0, import_node_url.fileURLToPath)(url));
    const traversed = [];
    let result;
    while (import_node_path.default.dirname(directory) !== directory) {
      if (packageCache.has(directory)) {
        result = packageCache.get(directory);
        break;
      }
      traversed.push(directory);
      try {
        const manifest = JSON.parse(
          (0, import_node_fs.readFileSync)(
            import_node_path.default.join(directory, 'package.json'),
            'utf8',
          ),
        );
        if (manifest.name) {
          result = compilerPackageNames.has(manifest.name) ? directory : void 0;
          break;
        }
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      directory = import_node_path.default.dirname(directory);
    }
    for (const directory2 of traversed) packageCache.set(directory2, result);
    return result;
  };
  for (const module2 of Object.values(require2.cache)) {
    if (!module2 || implementation((0, import_node_url.pathToFileURL)(module2.filename).href))
      continue;
    if (
      module2.children.some(child =>
        compilerRoot((0, import_node_url.pathToFileURL)(child.filename).href),
      )
    )
      throw new import_errors.TypeScriptFailure(
        'backend',
        `Install the compiler gateway before loading ${module2.filename}`,
      );
  }
  const target = /* @__PURE__ */ Object.create(null);
  const functionCache = /* @__PURE__ */ new Map();
  const names = Object.getOwnPropertyNames(provider.exports);
  for (const name of names.filter(name2 => !['default', '__esModule'].includes(name2)))
    Object.defineProperty(target, name, {
      enumerable: true,
      get() {
        healthy();
        const value = provider.exports[name];
        if (typeof value !== 'function') return value;
        const invoke = call => {
          healthy();
          try {
            return call();
          } catch (error) {
            if (error instanceof import_errors.TypeScriptFailure) failure ??= error;
            throw error;
          }
        };
        if (!functionCache.has(name))
          functionCache.set(
            name,
            new Proxy(value, {
              apply: (target2, _this, args) =>
                invoke(() => Reflect.apply(target2, provider.exports, args)),
              construct: (target2, args, newTarget) =>
                invoke(() => Reflect.construct(target2, args, newTarget)),
            }),
          );
        return functionCache.get(name);
      },
    });
  const facade = new Proxy(Object.freeze(target), {
    get(target2, key, receiver) {
      healthy();
      if (key === '__esModule') return true;
      if (key === 'default') return receiver;
      if (typeof key === 'symbol') return Reflect.get(target2, key, receiver);
      if (!Object.hasOwn(target2, key))
        return fail(`Compiler provider ${provider.name} does not implement ${key}`, key);
      return Reflect.get(target2, key, receiver);
    },
  });
  const gateway = Object.freeze({
    provider: provider.name,
    facade,
    assertHealthy: healthy,
    observations: () =>
      Object.freeze([...observations.values()].map(value => Object.freeze({ ...value }))),
  });
  const hints = names
    .filter(name => /^[A-Za-z_$][\w$]*$/.test(name) && !['default', '__esModule'].includes(name))
    .map((name, i) => `const v${i}=facade[${JSON.stringify(name)}];export {v${i} as ${name}};`)
    .join('\n');
  const source = `const facade=globalThis[Symbol.for(${JSON.stringify(Symbol.keyFor(registry))})].facade;
export default facade;export {facade as 'module.exports'};
${hints}`;
  const metadataSource = `const metadata=Object.freeze(${JSON.stringify(provider.packageMetadata)});export default metadata;export {metadata as 'module.exports'};`;
  const supportedRoot = specifier =>
    /^(?:typescript|typescript-classic)$/.test(specifier) ||
    /^(?:typescript|typescript-classic)\/lib\/(?:typescript|tsserverlibrary)(?:\.js)?$/.test(
      specifier,
    );
  (0, import_node_module.registerHooks)({
    resolve(specifier, context, next) {
      if (specifier === virtualModule || specifier === metadataModule)
        return { url: specifier, shortCircuit: true };
      const parent = context.parentURL ?? '';
      if (implementation(parent) || ['typescript/control', 'typescript/errors'].includes(specifier))
        return next(specifier, context);
      if (compilerEntry.test(specifier)) {
        healthy();
        observations.set(`${parent}:${specifier}`, { importer: parent, specifier });
        if (/^(?:typescript|typescript-classic)\/package\.json$/.test(specifier))
          return { url: metadataModule, shortCircuit: true };
        if (!supportedRoot(specifier))
          return fail(
            `Unsupported dependency compiler entry: ${specifier} from ${parent}`,
            specifier,
          );
        return { url: virtualModule, shortCircuit: true };
      }
      const resolved = next(specifier, context);
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
