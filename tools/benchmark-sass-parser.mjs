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
// Capture on each branch, then compare saved bundles without switching branches:
//   node tools/benchmark-sass-parser.mjs capture sass-parser
//   node tools/benchmark-sass-parser.mjs capture statement-parser
//   node tools/benchmark-sass-parser.mjs compare sass-parser statement-parser
import { readFileSync, writeFileSync, existsSync, mkdirSync, globSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { cpus } from 'node:os';

const outputDir = resolve(process.env.SASS_BENCHMARK_DIR ?? 'target/sass-comparison');
const script = fileURLToPath(import.meta.url);
const [, , command, ...labels] = process.argv;
const require = createRequire(import.meta.url);
const hash = value => createHash('sha256').update(value).digest('hex');
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
// Keep capture compatible with the upstream alternative's original file layout.
const linterFolder = 'packages/analysis/src/css/linter';
const sassFolder = existsSync(`${linterFolder}/sass/index.ts`)
  ? `${linterFolder}/sass`
  : linterFolder;
const sourceFiles = [
  sassFolder === linterFolder ? `${sassFolder}/sass.ts` : `${sassFolder}/index.ts`,
  ...[
    'postcss-ast-builder',
    'sass-statement-parser',
    'sass-statement-scanner',
    'sass-statement-rules',
    'sass-statement',
  ].map(name => `${sassFolder}/${name}.ts`),
];

function corpus() {
  return globSync(['its/**/*.sass', 'packages/**/*.sass'], {
    exclude: ['**/node_modules/**', '**/.git/**'],
  })
    .sort()
    .map(file => ({ file: resolve(file), code: readFileSync(file, 'utf8') }));
}

function astShape(node) {
  const keys = ['type', 'name', 'params', 'selector', 'prop', 'value', 'important', 'text'];
  return {
    ...Object.fromEntries(keys.filter(key => node[key] !== undefined).map(key => [key, node[key]])),
    start: node.source?.start,
    end: node.source?.end,
    nodes: node.nodes?.map(astShape),
  };
}

async function worker(mode, label) {
  global.gc?.();
  const before = process.memoryUsage();
  const start = performance.now();
  const module = require(
    resolve(outputDir, `${label}-${mode === 'lint' ? 'linter' : 'syntax'}.cjs`),
  );
  const loadMs = performance.now() - start;
  global.gc?.();
  const after = process.memoryUsage();
  if (mode === 'cold') {
    return {
      loadMs,
      rssDeltaBytes: after.rss - before.rss,
      heapUsedDeltaBytes: after.heapUsed - before.heapUsed,
    };
  }
  const files = corpus();
  let run;
  if (mode === 'lint') {
    const { cssRulesMeta, cssOnlyRuleKeys } = await import(
      pathToFileURL(resolve('lib/analysis/src/css/rules/metadata.js'))
    );
    const linter = new module.LinterWrapper();
    linter.initialize(
      cssRulesMeta
        .filter(
          ({ stylelintKey }) =>
            !cssOnlyRuleKeys.has(stylelintKey) && stylelintKey !== 'no-empty-source',
        )
        .map(({ stylelintKey }) => ({ key: stylelintKey, configurations: [] })),
    );
    run = async () => {
      for (const { file, code } of files) await linter.lint(file, code);
    };
  } else {
    run = () => {
      for (const { file, code } of files) module.postcssSass.parse(code, { from: file });
    };
  }
  for (let warmup = 0; warmup < 3; warmup++) await run();
  const timesMs = [];
  for (let iteration = 0; iteration < (mode === 'lint' ? 7 : 15); iteration++) {
    const start = performance.now();
    await run();
    timesMs.push(performance.now() - start);
  }
  const correctness = [];
  const linter = mode === 'lint' ? new module.LinterWrapper() : undefined;
  if (linter) {
    const { cssRulesMeta, cssOnlyRuleKeys } = await import(
      pathToFileURL(resolve('lib/analysis/src/css/rules/metadata.js'))
    );
    linter.initialize(
      cssRulesMeta
        .filter(
          ({ stylelintKey }) =>
            !cssOnlyRuleKeys.has(stylelintKey) && stylelintKey !== 'no-empty-source',
        )
        .map(({ stylelintKey }) => ({ key: stylelintKey, configurations: [] })),
    );
  }
  for (const { file, code } of files) {
    try {
      if (linter) {
        const { issues } = await linter.lint(file, code);
        correctness.push({
          file,
          issues,
          parsingErrors: issues.filter(issue => issue.ruleId === 'CssSyntaxError').length,
        });
      } else {
        const root = module.postcssSass.parse(code, { from: file });
        correctness.push({
          file,
          astHash: hash(JSON.stringify(astShape(root))),
          roundtrip: root.toString(module.postcssSass.stringify) === code,
        });
      }
    } catch (error) {
      correctness.push({ file, error: String(error) });
    }
  }
  const probes =
    mode === 'parse'
      ? [
          { name: 'comment inside map', code: '$map: (\n  // explanation\n  color: red,\n)\n' },
          { name: 'comment on conditional header', code: '@if $x // note\n  a\n    color: red\n' },
          { name: 'invalid annotation', code: 'a\n  color: red !imprtant\n' },
          { name: 'missing arithmetic operand', code: '$x: 1 +\n' },
          { name: 'invalid for clause', code: '@for $i from 1 till 3\n  a\n    color: red\n' },
          { name: 'unquoted use URL', code: '@use theme\n' },
          { name: 'unbalanced expression', code: 'a\n  color: (\n' },
        ].map(({ name, code }) => {
          try {
            const root = module.postcssSass.parse(code, { from: '/probe.sass' });
            return {
              name,
              code,
              accepted: true,
              roundtrip: root.toString(module.postcssSass.stringify) === code,
            };
          } catch (error) {
            return { name, code, accepted: false, error: error.reason ?? error.message };
          }
        })
      : undefined;
  return {
    probes,
    medianMs: median(timesMs),
    minMs: Math.min(...timesMs),
    maxMs: Math.max(...timesMs),
    timesMs,
    correctness,
  };
}

function spawnWorker(mode, label) {
  return JSON.parse(
    execFileSync(process.execPath, ['--expose-gc', script, 'worker', mode, label], {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    }),
  );
}

async function capture(label) {
  const { build } = await import('esbuild');
  const { buildBundle } = await import('../esbuild-common.mjs');
  mkdirSync(outputDir, { recursive: true });
  execFileSync(resolve('node_modules/.bin/tsgo'), ['-p', 'packages/tsconfig.app.json'], {
    stdio: 'inherit',
  });
  const syntax = await build({
    entryPoints: [sourceFiles[0]],
    outfile: resolve(outputDir, `${label}-syntax.cjs`),
    bundle: true,
    minify: true,
    platform: 'node',
    format: 'cjs',
    metafile: true,
  });
  writeFileSync(resolve(outputDir, `${label}-syntax-meta.json`), JSON.stringify(syntax.metafile));
  const entry = resolve(outputDir, 'entry.mjs');
  writeFileSync(
    entry,
    `export {postcssSass} from ${JSON.stringify(resolve(sourceFiles[0]))};\nexport {LinterWrapper} from ${JSON.stringify(resolve('packages/analysis/src/css/linter/wrapper.ts'))};\n`,
  );
  await buildBundle({ entryPoint: entry, outfile: resolve(outputDir, `${label}-linter.cjs`) });
  await buildBundle({
    entryPoint: './server.mjs',
    outfile: resolve(outputDir, `${label}-bridge.cjs`),
  });
  const files = sourceFiles.filter(existsSync);
  writeFileSync(
    resolve(outputDir, `${label}-manifest.json`),
    JSON.stringify(
      {
        revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
        branch: execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim(),
        trackedDiff: execFileSync('git', ['diff', '--stat'], { encoding: 'utf8' }),
        sources: files.map(file => ({
          file,
          lines: readFileSync(file, 'utf8').trimEnd().split('\n').length,
          hash: hash(readFileSync(file)),
        })),
      },
      null,
      2,
    ),
  );
  console.log(`Captured ${label} into ${outputDir}`);
}

function sizes(label) {
  return Object.fromEntries(
    ['syntax', 'linter', 'bridge'].map(kind => {
      const code = readFileSync(resolve(outputDir, `${label}-${kind}.cjs`));
      return [
        kind,
        {
          bytes: code.length,
          gzipBytes: gzipSync(code, { level: 9 }).length,
          brotliBytes: brotliCompressSync(code, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } })
            .length,
        },
      ];
    }),
  );
}

async function compare(labels) {
  const files = corpus();
  const result = {
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      cpu: cpus()[0]?.model,
    },
    corpus: {
      files: files.length,
      bytes: files.reduce((n, { code }) => n + Buffer.byteLength(code), 0),
      sha256: hash(
        JSON.stringify(
          files.map(({ file, code }) => ({
            file: relative(process.cwd(), file).replaceAll('\\', '/'),
            code,
          })),
        ),
      ),
    },
    methodology:
      'Separate processes per variant and mode. 3 full-corpus warmups; 15 parse samples; 7 lint samples. Cold module loading: 7 fresh processes, median. File IO excluded from warm timings. Compression: gzip level 9, Brotli quality 5. Lint results use all non-CSS-only rules, except no-empty-source, with default options. Heap/RSS deltas measure syntax loading and are approximate.',
    variants: {},
  };
  for (const label of labels) {
    console.log(`Measuring ${label}…`);
    const cold = Array.from({ length: 7 }, () => spawnWorker('cold', label));
    result.variants[label] = {
      manifest: JSON.parse(readFileSync(resolve(outputDir, `${label}-manifest.json`), 'utf8')),
      sizes: sizes(label),
      cold: {
        loadMs: median(cold.map(x => x.loadMs)),
        rssDeltaBytes: median(cold.map(x => x.rssDeltaBytes)),
        heapUsedDeltaBytes: median(cold.map(x => x.heapUsedDeltaBytes)),
      },
      parse: spawnWorker('parse', label),
      lint: spawnWorker('lint', label),
    };
  }
  writeFileSync(resolve(outputDir, 'results.json'), JSON.stringify(result, null, 2));
  console.table(
    Object.fromEntries(
      Object.entries(result.variants).map(([label, v]) => [
        label,
        {
          syntaxKB: (v.sizes.syntax.bytes / 1000).toFixed(1),
          bridgeMB: (v.sizes.bridge.bytes / 1000000).toFixed(2),
          coldMs: v.cold.loadMs.toFixed(1),
          parseMs: v.parse.medianMs.toFixed(1),
          lintMs: v.lint.medianMs.toFixed(1),
          roundtrips: v.parse.correctness.filter(x => x.roundtrip).length,
        },
      ]),
    ),
  );
  console.log(`Detailed results: ${outputDir}/results.json`);
}

if (command === 'worker') {
  process.stdout.write(JSON.stringify(await worker(labels[0], labels[1])));
} else {
  if (!labels.length || labels.some(label => !/^[a-z0-9-]+$/.test(label)))
    throw new Error(
      'Use capture <label> or compare <label> <label>, with lowercase hyphenated labels.',
    );
  if (command === 'capture' && labels.length === 1) await capture(labels[0]);
  else if (command === 'compare' && labels.length >= 2) await compare(labels);
  else throw new Error('Use capture <label> or compare <label> <label>.');
}
