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
// Adopt the pinned typescript-eslint front-end sources. See the vendor README.
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, readdir, stat, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = path.join(root, 'packages/analysis/src/jsts/frontend/vendor');
const manifest = JSON.parse(await readFile(path.join(destination, 'upstream.json'), 'utf8'));
const upstream = path.resolve(process.argv[2] ?? '');
if (
  execFileSync('git', ['rev-parse', 'HEAD'], { cwd: upstream, encoding: 'utf8' }).trim() !==
  manifest.commit
) {
  throw new Error(`Expected typescript-eslint ${manifest.commit}`);
}
if (execFileSync('git', ['status', '--porcelain'], { cwd: upstream, encoding: 'utf8' }).trim()) {
  throw new Error('The pinned upstream checkout must be clean');
}
const directories = ['types', 'scope-manager', 'visitor-keys'];
const selected = new Set();
async function add(file) {
  if (selected.has(file)) return;
  selected.add(file);
  const text = await readFile(path.join(upstream, file), 'utf8');
  for (const match of text.matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/g)) {
    if (!match[1].startsWith('.')) continue;
    const base = path.posix.join(path.posix.dirname(file), match[1]);
    if (base === 'packages/typescript-estree/src/parseSettings') continue;
    for (const candidate of [base + '.ts', base + '/index.ts']) {
      if (await stat(path.join(upstream, candidate)).catch(() => false)) {
        await add(candidate);
        break;
      }
    }
  }
}
for (const name of directories) {
  for (const entry of await readdir(path.join(upstream, 'packages', name, 'src'), {
    recursive: true,
  })) {
    if (entry.endsWith('.ts')) await add(`packages/${name}/src/${entry}`);
  }
}
for (const name of manifest.converterEntries)
  await add(`packages/typescript-estree/src/${name}.ts`);
const config = await prettier.resolveConfig(path.join(root, 'package.json'));
// Remove obsolete adopted sources when upgrading; documentation and pin stay owned here.
for (const name of [...directories, 'typescript-estree']) {
  await rm(path.join(destination, name), { recursive: true, force: true });
}
for (const file of selected) {
  const relative = file.replace(/^packages\/([^/]+)\/src\//, '$1/');
  let text = await readFile(path.join(upstream, file), 'utf8');
  text = text.replace(
    /((?:from\s+|import\s*|module\s+)['"])([^'"]+)(['"])/g,
    (all, start, specifier, end) => {
      let target;
      if (specifier.startsWith('.')) {
        const base = path.posix.join(path.posix.dirname(relative), specifier);
        target = [...selected]
          .map(f => f.replace(/^packages\/([^/]+)\/src\//, '$1/'))
          .find(f => f === base + '.ts' || f === base + '/index.ts');
        if (base === 'types/generated/ast-spec') target = base + '.ts';
      } else if (/^@typescript-eslint\/(types|scope-manager|visitor-keys)$/.test(specifier)) {
        target = specifier.replace('@typescript-eslint/', '') + '/index.ts';
      }
      if (!target) return all;
      let replacement = path.posix
        .relative(path.posix.dirname(relative), target)
        .replace(/\.ts$/, '.js');
      if (!replacement.startsWith('.')) replacement = './' + replacement;
      return start + replacement + end;
    },
  );
  // The converter only consumes these settings. Project discovery belongs to SonarJS.
  if (relative === 'typescript-estree/ast-converter.ts') {
    text = text.replace(
      "import type { ParseSettings } from './parseSettings';",
      `import type { ConverterOptions } from './convert.js';\ntype ParseSettings = ConverterOptions & { comment: boolean; loc: boolean; range: boolean; tokens: boolean };`,
    );
  }
  // Keep generated library instructions accurate in the adopted tree.
  text = text.replaceAll(
    'npx nx generate-lib repo',
    'node tools/sync-typescript-frontend.mjs /path/to/typescript-eslint',
  );
  const output = path.join(destination, relative);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, await prettier.format(text, { ...config, parser: 'typescript' }));
}
// Upstream publishes the flattened AST specification; its enums are also the runtime schema.
const typesPackage = path.join(root, 'node_modules/@typescript-eslint/types');
const typesVersion = JSON.parse(
  await readFile(path.join(typesPackage, 'package.json'), 'utf8'),
).version;
if (typesVersion !== manifest.version)
  throw new Error(`Expected @typescript-eslint/types ${manifest.version}`);
const spec = (await readFile(path.join(typesPackage, 'dist/generated/ast-spec.d.ts'), 'utf8'))
  .replace(
    /^\/\*[\s\S]*?\*\//,
    '// Adopted AST specification. Regenerate with tools/sync-typescript-frontend.mjs.',
  )
  .replaceAll('export declare ', 'export ');
await mkdir(path.join(destination, 'types/generated'), { recursive: true });
await writeFile(
  path.join(destination, 'types/generated/ast-spec.ts'),
  await prettier.format(spec, { ...config, parser: 'typescript' }),
);
await writeFile(path.join(destination, 'LICENSE'), await readFile(path.join(upstream, 'LICENSE')));
// These internal compiler-node fields are used by the adopted converter.
await writeFile(
  path.join(destination, 'typescript-internals.d.ts'),
  await readFile(path.join(upstream, 'packages/typescript-estree/typings/typescript.d.ts')),
);
const parser = await readFile(path.join(upstream, 'packages/parser/src/parser.ts'), 'utf8');
const scopeOptions =
  `// Adapted from typescript-eslint ${manifest.version} parser.ts; see vendor/LICENSE.\n` +
  "import ts, { ScriptTarget } from 'typescript';\n" +
  "import type { Lib } from './types/index.js';\n" +
  "import { typescriptVersionIsAtLeast } from './typescript-estree/version-check.js';\n" +
  parser
    .slice(parser.indexOf('const LIB_FILENAME_REGEX'), parser.indexOf('\nexport function parse('))
    .replace('function getLib(', 'export function getLib(');
await writeFile(
  path.join(destination, 'scope-options.ts'),
  await prettier.format(scopeOptions, { ...config, parser: 'typescript' }),
);
console.log(`Adopted ${selected.size} source files from ${manifest.commit}`);
