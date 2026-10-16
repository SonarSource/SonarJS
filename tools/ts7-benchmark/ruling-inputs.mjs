import fs from 'node:fs';
import path from 'node:path';
import { createRequire, registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

/** Read legacy master's own ruling setup, without changing its checked-out code.
 * Only testProject's final execution is replaced by returning its prepared inputs.
 * The original rule builders and configuration declarations remain authoritative.
 */
export async function legacyRulingInputs(root, name, corpus, sources) {
  const require = createRequire(path.join(root, 'package.json'));
  const ts = require('typescript');
  const file = path.join(root, 'packages/ruling/testProject.ts');
  const original = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, original, ts.ScriptTarget.Latest, true);
  const fn = ast.statements.find(
    n => ts.isFunctionDeclaration(n) && n.name?.text === 'testProject',
  );
  const declaration = (statement, name) =>
    ts.isVariableStatement(statement) &&
    statement.declarationList.declarations.find(d => d.name.getText(ast) === name);
  const boundary = fn?.body.statements.find(s => declaration(s, 'filesystemCacheSession'));
  const base = fn?.body.statements.map(s => declaration(s, 'baseDir')).find(Boolean);
  if (!boundary || !base) throw new Error('Unsupported legacy ruling setup; inspect this revision');
  const setup = original.slice(fn.body.getStart(ast) + 1, boundary.getStart(ast));
  const offset = fn.body.getStart(ast) + 1;
  const initializer = `normalizeToAbsolutePath(folder ? join(${JSON.stringify(sources)}, folder) : join(${JSON.stringify(corpus)}, name))`;
  const prepared =
    setup.slice(0, base.initializer.getStart(ast) - offset) +
    initializer +
    setup.slice(base.initializer.end - offset);
  const modified =
    original.slice(0, fn.body.getStart(ast)) +
    '{' +
    prepared +
    '\nreturn { name, baseDir, configuration, input: { rules, cssRules: buildCssRules(), bundles: [] } };\n}' +
    original.slice(fn.body.end);
  const emitted = ts.transpileModule(modified, {
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
    reportDiagnostics: true,
  });
  if (emitted.diagnostics.some(d => d.category === ts.DiagnosticCategory.Error))
    throw new Error('Cannot prepare legacy ruling module');
  const url = pathToFileURL(file).href;
  const hook = registerHooks({
    load(location, context, next) {
      if (location === url)
        return { format: 'module', source: emitted.outputText, shortCircuit: true };
      return next(location, context);
    },
  });
  try {
    const module = await import(url);
    const result = await module.testProject(name);
    result.preparation = {
      source: file,
      sourceSha256: createHash('sha256').update(original).digest('hex'),
      preparedSha256: createHash('sha256').update(emitted.outputText).digest('hex'),
      method:
        'Return legacy ruling setup before filesystemCacheSession; replace only baseDir for the shared corpus.',
    };
    return result;
  } finally {
    hook.deregister();
  }
}
