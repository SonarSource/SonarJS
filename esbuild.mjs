import esbuild from 'esbuild';
import textReplace from 'esbuild-plugin-text-replace';
import { copy } from 'esbuild-plugin-copy';

await esbuild.build({
  entryPoints: ['./bin/server.mjs'],
  outfile: './build/server.cjs',
  format: 'cjs',
  bundle: true,
  external: ['eslint/lib/util/glob-util'],
  platform: 'node',
  plugins: [
    textReplace({
      include: /\.(m|c)?js$/,
      pattern: [
        ['fileURLToPath(import.meta.url)', '__filename'],
        ['new URL(import.meta.url)', '__filename'],
        ['require.resolve("@babel/core/package.json")'],
        [/const babelParser = require.*\}\)\)/gms, 'const babelParser = require("@babel/parser")'],
        ['const espreePath = require.resolve("espree");', ''],
        ['config.parser = espreePath;', ''],
        [
          'tryRequire(`eslint-import-resolver-${name}`, sourceFile)',
          'require("eslint-import-resolver-node")',
        ],
      ],
    }),
    copy({
      resolveFrom: 'cwd',
      assets: [
        {
          from: ['./node_modules/typescript/lib/*.d.ts'],
          to: ['./build/'],
        },
        {
          from: ['./packages/jsts/src/parsers/estree.proto'],
          to: ['./build/'],
        },
      ],
    }),
  ],
});
