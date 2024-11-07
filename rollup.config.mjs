import createNodeResolvePlugin from '@rollup/plugin-node-resolve';
import createCommonJSPlugin from '@rollup/plugin-commonjs';
import createJSONPlugin from '@rollup/plugin-json';
import createIgnorePlugin from 'rollup-plugin-ignore';
import MagicString from 'magic-string';
import copy from 'rollup-plugin-copy';

/**
 * @var {Array<import("rollup").RollupOptions>}
 */
const options = [
  {
    plugins: [
      {
        transform(code, id) {
          const getTransformResult = ms => {
            const map = ms.generateMap();
            const newCode = ms.toString();
            const program = this.parse(newCode);
            return {
              code: newCode,
              program,
              map,
            };
          };
          if (id.includes('@babel/eslint-parser/lib/parse.cjs')) {
            const start = code.indexOf('const babelParser = ');
            const end = code.indexOf('let isRunningMinSupportedCoreVersion') - 1;
            const ms = new MagicString(code);
            ms.update(start, end, 'const babelParser = require("@babel/parser")');
            return getTransformResult(ms);
          } else if (id.includes('eslint/lib/rule-tester/rule-tester.js')) {
            const regex = /require\.resolve\(\"espree\"\);/gm;
            const ms = new MagicString(code);
            ms.replaceAll(regex, 'require.resolve("espree/dist/espree.cjs");');
            return getTransformResult(ms);
          }
          return null;
        },
        resolveId(source, importer, options) {
          if (source === 'esquery') {
            return { id: 'node_modules/esquery/dist/esquery.js' };
          } else if (source.includes('@babel/plugin-proposal-decorators')) {
            console.log('resolving', source, importer, options);
          }
          return null;
        },
      },
      createIgnorePlugin([
        'eslint/lib/util/glob-utils',
        'eslint/lib/util/glob-util',
        'eslint/lib/cli-engine/file-enumerator',
      ]),
      createNodeResolvePlugin({
        preferBuiltins: true,
      }),
      createCommonJSPlugin({
        dynamicRequireTargets: [
          'node_modules/espree/dist/espree.cjs',
          'node_modules/encoding/lib/encoding.js',
          'node_modules/esquery/dist/esquery.js',
          'node_modules/@babel/plugin-proposal-decorators/lib/*.js',
          'node_modules/@babel/plugin-proposal-decorators',
          // 'node_modules/@babel/parser/lib/index.js',
          // 'node_modules/@babel/eslint-parser/lib/index.js',
          // 'node_modules/@babel/preset-env/lib/index.js'
        ],
      }),
      createJSONPlugin(),
      copy({
        targets: [
          {
            src: 'lib/jsts/src/parsers/estree.proto',
            dest: 'target',
          },
        ],
      }),
    ],
    external: ['typescript'],
    treeshake: false, // it is important to not treeshake to preserve all the uncovered branches
    input: {
      server: 'bin/server.mjs',
    },
    output: [
      {
        freeze: false,
        format: 'cjs',
        dir: 'target',
        entryFileNames: '[name].cjs',
        chunkFileNames: '[name]-[hash].cjs',
      },
    ],
  },
];

export default options;
