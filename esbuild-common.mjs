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
import esbuild from 'esbuild';
import textReplace from 'esbuild-plugin-text-replace';
import { copy } from 'esbuild-plugin-copy';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const stylelintPkgJson = readFileSync('node_modules/stylelint/package.json', 'utf8');
const testingLibraryPkgJson = JSON.parse(
  readFileSync('node_modules/eslint-plugin-testing-library/package.json', 'utf8'),
);
const require = createRequire(import.meta.url);
const babelParserFromCore = JSON.stringify(
  require.resolve('@babel/parser', {
    paths: [require.resolve('@babel/core/package.json')],
  }),
);

/**
 * Build a SonarJS server bundle
 * @param {Object} options
 * @param {string} options.entryPoint - Entry point file (e.g., './server.mjs')
 * @param {string} options.outfile - Output file (e.g., './bin/server.cjs')
 * @param {Array} options.additionalAssets - Additional assets to copy (optional)
 */
export async function buildBundle({ entryPoint, outfile, additionalAssets = [] }) {
  const entryPointName = entryPoint.replace('./', '').replaceAll('.', String.raw`\.`);
  const entryPointRegex = new RegExp(`${entryPointName}$`);

  await esbuild.build({
    entryPoints: [entryPoint],
    outfile,
    format: 'cjs',
    bundle: true,
    loader: {
      '.json': 'copy',
    },
    external: ['eslint/lib/util/glob-util', 'jiti'],
    platform: 'node',
    minify: true,
    plugins: [
      textReplace({
        include: entryPointRegex,
        pattern: [['new URL(import.meta.url)', '__filename']],
      }),
      textReplace({
        include: /lib[/\\]jsts[/\\]src[/\\]parsers[/\\]ast\.js$/,
        pattern: [['path.dirname(fileURLToPath(import.meta.url))', '__dirname']],
      }),
      // Simplify the loader function in babel. At the end it's just importing Babel parser
      // This matches the result of the TS compilation of the following lines
      // https://github.com/babel/babel/blob/v7.25.1/eslint/babel-eslint-parser/src/parse.cts#L8-L12
      textReplace({
        include: /node_modules[/\\]@babel[/\\]eslint-parser[/\\]lib[/\\]parse\.cjs$/,
        pattern: [
          [
            /const babelParser = require.*}\)\)/gms,
            `const babelParser = require(${babelParserFromCore})`,
          ],
        ],
      }),
      // Babel 7 pulled in by eslint-plugin-react-hooks has optional .cts config support that
      // references @babel/preset-typescript. The bridge bundle never loads Babel config files,
      // so we can drop that branch instead of forcing an otherwise unused preset into the
      // packaged runtime.
      textReplace({
        include: /@babel[/\\]core[/\\]lib[/\\]config[/\\]files[/\\]module-types\.js$/,
        pattern: [
          [
            /const packageJson = require\("@babel\/preset-typescript\/package\.json"\);\s*if \(_semver\(\)\.lt\(packageJson\.version, "7\.21\.4"\)\) \{\s*console\.error\("`\.cts` configuration file failed to load, please try to update `@babel\/preset-typescript`\."\);\s*\}/g,
            '',
          ],
          [
            /function getTSPreset\(filepath\) \{\s*try \{\s*return require\("@babel\/preset-typescript"\);\s*\} catch \(error\) \{\s*if \(error\.code !== "MODULE_NOT_FOUND"\) throw error;\s*let message = "You appear to be using a \.cts file as Babel configuration, but the `@babel\/preset-typescript` package was not found: please install it!";\s*if \(process\.versions\.pnp\) \{\s*message \+= `[\s\S]*?`;\s*\}\s*throw new _configError\.default\(message, filepath\);\s*\}\s*\}/g,
            'function getTSPreset(filepath) { throw new _configError.default("You appear to be using a .cts file as Babel configuration, but the SonarJS bridge bundle does not support loading Babel .cts config files.", filepath); }',
          ],
        ],
      }),
      // eslint-plugin-vue legacy configs use require.resolve() to chain parent configs and set the
      // parser. SonarJS only uses pluginVue.rules; the configs are never applied. Replacing
      // require.resolve(...) with its string argument avoids a MODULE_NOT_FOUND crash at bridge
      // startup caused by the bundled modules having no real on-disk paths.
      textReplace({
        include: /node_modules[/\\]eslint-plugin-vue[/\\]dist[/\\]configs[/\\]/,
        pattern: [[/require\.resolve\(([^)]+)\)/g, '$1']],
      }),
      // Remove dynamic import of espree on ESLint Rule tester. In any case, it's never used in the bundle
      textReplace({
        include: /node_modules[/\\]eslint[/\\]lib[/\\]rule-tester[/\\]rule-tester\.js$/,
        pattern: [
          // https://github.com/eslint/eslint/blob/v8.57.0/lib/rule-tester/rule-tester.js#L56
          ['const espreePath = require.resolve("espree");', ''],
          // https://github.com/eslint/eslint/blob/v8.57.0/lib/rule-tester/rule-tester.js#L781
          ['config.parser = espreePath;', ''],
        ],
      }),
      // Remove dynamic import of unused stylelint extensions
      textReplace({
        include: /node_modules[/\\]postcss-html[/\\]lib[/\\]syntax[/\\]build-syntax-resolver\.js$/,
        pattern: [
          ['sugarss: () => require("sugarss"),', ''],
          ['"postcss-styl": () => require("postcss-styl"),', ''],
        ],
      }),
      // Remove createRequire from rolldown, used by tsdown, used by @stylistic
      textReplace({
        include: /node_modules[/\\]@stylistic[/\\]eslint-plugin[/\\]dist[/\\]vendor\.js$/,
        pattern: [
          [
            '__importStar$4(__require("@eslint-community/eslint-utils"))',
            'require("@eslint-community/eslint-utils")',
          ],
          [
            '__importStar$3(__require("@eslint-community/eslint-utils"))',
            'require("@eslint-community/eslint-utils")',
          ],
          [
            '__importStar$2(__require("@eslint-community/eslint-utils"))',
            'require("@eslint-community/eslint-utils")',
          ],
          [
            '__importStar$1(__require("@eslint-community/eslint-utils"))',
            'require("@eslint-community/eslint-utils")',
          ],
          [
            '__importStar(__require("@eslint-community/eslint-utils"))',
            'require("@eslint-community/eslint-utils")',
          ],
          ['__require("@typescript-eslint/types")', 'require("@typescript-eslint/types")'],
        ],
      }),
      // Remove createRequires
      textReplace({
        include: /node_modules[/\\]@stylistic[/\\]eslint-plugin[/\\]dist[/\\]rolldown-runtime\.js$/,
        pattern: [['createRequire(import.meta.url);', 'createRequire(__filename);']],
      }),
      // Babel 8 config-file helpers still use createRequire(import.meta.url); in the bundled CJS
      // output this becomes createRequire(undefined), which breaks standalone bridge startup.
      textReplace({
        include: /node_modules[/\\]@babel[/\\]core[/\\]lib[/\\]config[/\\]files[/\\]index\.js$/,
        pattern: [[/createRequire\(import\.meta\.url\)/g, 'createRequire(__filename)']],
      }),
      textReplace({
        include: /node_modules[/\\]@babel[/\\]eslint-parser[/\\]lib[/\\]index\.js$/,
        pattern: [
          [
            /const require\$\d+ = createRequire\((?:import\.meta\.url|__filename)\);\s*const babelParser = require\$\d+\(require\$\d+\.resolve\("@babel\/parser", \{\s*paths: \[require\$\d+\.resolve\("@babel\/core\/package\.json"\)\]\s*\}\)\);/g,
            `const babelParser = require(${babelParserFromCore});`,
          ],
        ],
      }),
      // eslint-plugin-testing-library reads its own name/version off package.json via
      // createRequire(import.meta.url)(...); in the bundled CJS output import.meta.url is
      // undefined, which breaks standalone bridge startup the same way the Babel case above does.
      textReplace({
        include: /node_modules[/\\]eslint-plugin-testing-library[/\\]dist[/\\]index\.mjs$/,
        pattern: [
          [
            'createRequire(import.meta.url)(resolve(dirname(fileURLToPath(import.meta.url)), "../package.json"))',
            JSON.stringify({
              name: testingLibraryPkgJson.name,
              version: testingLibraryPkgJson.version,
            }),
          ],
        ],
      }),
      textReplace({
        include: /node_modules[/\\]css-tree[/\\]lib[/\\]data-patch\.js$/,
        pattern: [['const require = createRequire(import.meta.url);', '']],
      }),
      textReplace({
        include: /node_modules[/\\]css-tree[/\\]lib[/\\]data\.js$/,
        pattern: [['const require = createRequire(import.meta.url);', '']],
      }),
      textReplace({
        include: /node_modules[/\\]css-tree[/\\]lib[/\\]version\.js$/,
        pattern: [['const require = createRequire(import.meta.url);', '']],
      }),
      textReplace({
        include: /node_modules[/\\]stylelint[/\\]lib[/\\]utils[/\\]mathMLTags\.mjs$/,
        pattern: [['const require = createRequire(import.meta.url);', '']],
      }),
      textReplace({
        include:
          /node_modules[\/\\]stylelint[\/\\]lib[\/\\]rules[\/\\]declaration-property-value-no-unknown[\/\\]index\.mjs$/,
        pattern: [['const require = createRequire(import.meta.url);', '']],
      }),
      // Dynamic import in module used by eslint-import-plugin. It always resolves to node resolver
      textReplace({
        include: /node_modules[/\\]eslint-module-utils[/\\]resolve\.js$/,
        pattern: [
          [
            // https://github.com/import-js/eslint-plugin-import/blob/v2.11.0/utils/resolve.js#L157
            'tryRequire(`eslint-import-resolver-${name}`, sourceFile)',
            'require("eslint-import-resolver-node")',
          ],
        ],
      }),
      // The comparison by constructor name made by stylelint is not valid in the bundle because
      // the Document object is named differently. We need to compare constructor object directly
      textReplace({
        include: /node_modules[/\\]stylelint[/\\]lib[/\\]lintPostcssResult\.mjs$/,
        pattern: [
          [
            "postcssDoc && postcssDoc.constructor.name === 'Document' ? postcssDoc.nodes : [postcssDoc]",
            "postcssDoc && (postcssDoc instanceof require('postcss').Document) ? postcssDoc.nodes : [postcssDoc]",
          ],
          ['const require = createRequire(import.meta.url);', ''],
        ],
      }),
      // do not let stylelint fs read its package.json
      textReplace({
        include: /node_modules[/\\]stylelint[/\\]lib[/\\]utils[/\\]FileCache.mjs$/,
        pattern: [
          [
            "JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));",
            stylelintPkgJson,
          ],
        ],
      }),
      copy({
        resolveFrom: 'cwd',
        assets: [
          // We need to copy all typescript declaration files for type-checking, as typescript will
          // look for those in the filesystem
          {
            from: ['./node_modules/typescript/lib/*.d.ts'],
            to: ['./bin'],
          },
          ...additionalAssets,
        ],
      }),
    ],
  });
}
