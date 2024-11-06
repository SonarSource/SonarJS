import createNodeResolvePlugin from '@rollup/plugin-node-resolve';
import createCommonJSPlugin from '@rollup/plugin-commonjs';
import createJSONPlugin from '@rollup/plugin-json';
import createIgnorePlugin from 'rollup-plugin-ignore';
import MagicString from 'magic-string';
import copy from 'rollup-plugin-copy';

const getTransformResult = (ms, parse) => {
  const map = ms.generateMap();
  const newCode = ms.toString();
  const program = parse(newCode);
  return {
    code: newCode,
    program,
    map,
  };
};

/**
 * @var {Array<import("rollup").RollupOptions>}
 */
const options = [
  {
    plugins: [
      {
        transform(code, id) {
          if (id.includes('@babel/eslint-parser/lib/parse.cjs')) {
            const start = code.indexOf('const babelParser = ');
            const end = code.indexOf('let isRunningMinSupportedCoreVersion') - 1;
            const ms = new MagicString(code);
            ms.update(start, end, 'const babelParser = require("@babel/parser")');
            return getTransformResult(ms, this.parse);
          } else if (id.includes('bridge/src/server.js')) {
            const regex = /'\.\.\/\.\.\/\.\.\/lib\/bridge\/src\/worker\.js'/gm;
            const ms = new MagicString(code);
            ms.replace(regex, '"worker.cjs"');
            return getTransformResult(ms, this.parse);
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
          'node_modules/espree',
          // "node_modules/esquery",
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
    treeshake: false, // it is important to not treeshake to preserve all the uncovered branches
    input: {
      worker: 'lib/bridge/src/worker.js',
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
