import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { assertCompilerRouting } from './routing.mjs';

// Only Node built-ins are loaded before selecting the repository/backend.
const [configPath, outputPath] = process.argv.slice(2);
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const normalize = value => value.replaceAll('\\', '/');
const root = normalize(path.resolve(config.project));
const load = file => import(pathToFileURL(path.join(config.sonarRoot, file)).href);
const require = createRequire(path.join(config.sonarRoot, 'package.json'));
const hash = text => createHash('sha256').update(text).digest('hex');
const start = performance.now();
const report = { backend: config.backend, valid: false, errors: [], timings: {}, issues: {} };
let Linter, gateway;
try {
  const ts = require('typescript');
  if (config.backend === 'adapter') {
    gateway = require('typescript/control').getCompilerGateway();
    if (gateway.provider !== 'ts6' || gateway.facade !== ts)
      throw new Error('Candidate must use the owned TS6 module');
  }
  report.versions = {
    node: process.version,
    compiler: ts.version,
    parser: require('@typescript-eslint/parser/package.json').version,
    eslint: require('eslint/package.json').version,
  };
  const library = normalize(path.dirname(ts.getDefaultLibFilePath({})));
  const canonical = file => {
    const normalized = normalize(file);
    return normalized.startsWith(library + '/')
      ? '$TYPESCRIPT_LIB/' + normalized.slice(library.length + 1)
      : normalized;
  };
  const { createProgramOptions } = await load(
    'packages/analysis/src/jsts/program/tsconfig/options.ts',
  );
  const signals = await load(
    'packages/analysis/src/jsts/rules/helpers/dependency-manifests/dependencies.ts',
  );
  const nodeVersionSignal = signals.getNodeVersionSignal(root);
  const typeScriptVersionSignal = signals.getTypeScriptVersionSignal(root);
  let before = performance.now();
  const options = createProgramOptions(
    normalize(path.join(root, 'tsconfig.json')),
    undefined,
    true,
    undefined,
    root,
  );
  if (options.missingTsConfig || options.configFileParsingDiagnostics?.length)
    throw new Error('Config has missing references or diagnostics');
  const filenames = options.rootNames
    .filter(file => /\.[cm]?[jt]sx?$/.test(file) && !/\.d\.[cm]?ts$/.test(file))
    .sort();
  const texts = new Map(filenames.map(file => [file, fs.readFileSync(file, 'utf8')]));
  report.files = filenames.map(file => normalize(path.relative(root, file)));
  report.sourceHashes = Object.fromEntries(
    [...texts].map(([file, text]) => [normalize(path.relative(root, file)), hash(text)]),
  );
  report.signals = { nodeVersionSignal, typeScriptVersionSignal };
  report.timings.configMs = performance.now() - before;
  const metas = await load('packages/analysis/src/jsts/rules/metas.ts');
  let rules = config.rules;
  if (config.backend === 'prepare') {
    const source = ts.createSourceFile(
      'testProject.ts',
      fs.readFileSync(path.join(config.sonarRoot, 'packages/ruling/testProject.ts'), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const helper = source.statements.find(
      node => ts.isFunctionDeclaration(node) && node.name?.text === 'applyRulingConfig',
    );
    if (!helper) throw new Error('Missing pure applyRulingConfig helper');
    const emitted = ts.transpileModule(helper.getText(source), {
      compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.CommonJS },
    }).outputText;
    const apply = new Function(emitted + '; return applyRulingConfig;')();
    rules = Object.entries(metas).flatMap(([key, meta]) =>
      meta.languages.map(language =>
        apply({
          key,
          configurations: [],
          language,
          fileTypeTargets: meta.scope === 'Tests' ? ['TEST'] : ['MAIN'],
          analysisModes: ['DEFAULT'],
          blacklistedExtensions: meta.blacklistedExtensions,
        }),
      ),
    );
    report.rules = rules;
    report.valid = true;
  } else {
    ({ Linter } = await load('packages/analysis/src/jsts/linter/linter.ts'));
    for (const rule of rules)
      if (!metas[rule.key] || !Linter.rules[rule.key]) throw new Error(`Missing rule ${rule.key}`);
    report.rulesHash = hash(JSON.stringify(rules));
    const { setSourceFilesContext } = await load(
      'packages/analysis/src/jsts/program/cache/sourceFileCache.ts',
    );
    setSourceFilesContext(
      Object.fromEntries([...texts].map(([file, fileContent]) => [file, { fileContent }])),
    );
    before = performance.now();
    const { createStandardProgram } = await load('packages/analysis/src/jsts/program/factory.ts');
    const { IncrementalCompilerHost } = await load(
      'packages/analysis/src/jsts/program/compilerHost.ts',
    );
    const program = createStandardProgram({
      ...options,
      host: new IncrementalCompilerHost(options.options, root, true),
    });
    report.timings.programMs = performance.now() - before;
    const sourceFiles = program.getSourceFiles().map(file => file.fileName);
    report.programFiles = Object.fromEntries(
      sourceFiles
        .map(file => [canonical(file), hash(fs.readFileSync(file, 'utf8'))])
        .sort(([a], [b]) => a.localeCompare(b)),
    );
    report.activeRules = {};
    const getRules = Linter.getRulesForFile;
    Linter.getRulesForFile = function (...args) {
      const result = Reflect.apply(getRules, this, args);
      report.activeRules[normalize(path.relative(root, args[0]))] = result;
      return result;
    };
    before = performance.now();
    await Linter.initialize({ baseDir: root, detectGeneratedCode: false, rules });
    report.timings.initializeMs = performance.now() - before;
    const { build } = await load('packages/analysis/src/jsts/builders/build.ts');
    report.timings.parseMs = 0;
    report.timings.lintMs = 0;
    report.fileTimings = [];
    for (const file of filenames) {
      before = performance.now();
      const parsed = build(
        {
          filePath: file,
          fileContent: texts.get(file),
          program,
          tsConfigs: [],
          language: /\.[cm]?jsx?$/.test(file) ? 'js' : 'ts',
          allowTsParserJsFiles: true,
        },
        { jsx: /x$/.test(file) },
      );
      const parseMs = performance.now() - before;
      if (!report.compilerOptions) {
        report.compilerOptions = program.getCompilerOptions();
        report.rootNames = program.getRootFileNames();
      }
      before = performance.now();
      const language = /\.[cm]?jsx?$/.test(file) ? 'js' : 'ts';
      const { issues } = Linter.lint(
        parsed,
        file,
        'MAIN',
        'CHANGED',
        'DEFAULT',
        language,
        undefined,
        'module',
      );
      const lintMs = performance.now() - before;
      report.timings.parseMs += parseMs;
      report.timings.lintMs += lintMs;
      const relative = normalize(path.relative(root, file));
      report.fileTimings.push({ file: relative, parseMs, lintMs });
      for (const issue of issues) {
        const files = (report.issues[`${language}-${issue.ruleId}`] ??= {});
        (files[relative] ??= []).push(issue.line);
      }
    }
    if (gateway) {
      report.compilerRouting = assertCompilerRouting(gateway, ts);
    }
    report.valid = true;
  }
} catch (error) {
  report.errors.push({ message: error.message, stack: error.stack });
} finally {
  report.timings.analysisMs = performance.now() - start;
  if (report.timings.lintMs !== undefined) {
    report.timings.coreMs = ['configMs', 'programMs', 'initializeMs', 'parseMs', 'lintMs'].reduce(
      (total, phase) => total + report.timings[phase],
      0,
    );
    report.timings.setupAndVerificationMs = report.timings.analysisMs - report.timings.coreMs;
  }
  report.memory = { maxRssBytes: process.resourceUsage().maxRSS * 1024, ...process.memoryUsage() };
  try {
    Linter?.releaseAfterAnalysis();
    gateway?.assertHealthy();
  } catch (error) {
    report.errors.push({ message: error.message, stack: error.stack });
    report.valid = false;
  }
  for (const files of Object.values(report.issues))
    for (const lines of Object.values(files)) lines.sort((a, b) => a - b);
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
}
if (!report.valid) process.exitCode = 2;
