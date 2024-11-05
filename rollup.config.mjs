import createNodeResolvePlugin from '@rollup/plugin-node-resolve';
import createCommonJSPlugin from '@rollup/plugin-commonjs';
import createJSONPlugin from '@rollup/plugin-json';
import createIgnorePlugin from 'rollup-plugin-ignore';
import FsExtra from 'fs-extra';
import { dirname, join, resolve } from 'node:path';

const { emptyDirSync } = FsExtra;

const ignores = [
  'eslint/lib/util/glob-utils',
  'eslint/lib/util/glob-util',
  'eslint/lib/cli-engine/file-enumerator',
];
/**
 * @var {import("rollup").RollupOptions}
 */
const commonOptions = {
  plugins: [
    createIgnorePlugin(ignores),
    // createTypeScriptPlugin(),
    createNodeResolvePlugin({
      preferBuiltins: true,
      // mainFields: ["browser", "main", "module"],
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
  ],
  treeshake: false, // it is important to not treeshake to preserve all the uncovered branches
};
/**
 * @var {Array<import("rollup").RollupOptions>}
 */
const options = [
  {
    ...commonOptions,
    input: 'bin/server.mjs',
    output: [
      {
        freeze: false,
        format: 'cjs',
        file: join('target', 'server.cjs'),
      },
    ],
  },
  {
    ...commonOptions,
    input: 'lib/bridge/src/worker.js',
    output: [
      {
        freeze: false,
        format: 'cjs',
        file: join('target', 'worker.cjs'),
      },
    ],
  },
];

export default options;
