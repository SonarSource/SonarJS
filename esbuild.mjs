import esbuild from 'esbuild';
import textReplace from 'esbuild-plugin-text-replace';
import { copy } from 'esbuild-plugin-copy';

await esbuild.build({
  entryPoints: ['./server.mjs'],
  outfile: './bin/server.cjs',
  format: 'cjs',
  bundle: true,
  external: ['eslint/lib/util/glob-util'],
  platform: 'node',
  minify: true,
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
        [
          'style.syntax = loadSyntax(opts, __dirname);',
          'style.syntax = {parse: require("postcss-html/template-parse"), stringify: require("postcss/lib/stringify")}; opts.syntax.config["css"]={stringify: require("postcss/lib/stringify"),parse: require("postcss/lib/parse")}',
        ],
        [
          "postcssDoc && postcssDoc.constructor.name === 'Document' ? postcssDoc.nodes : [postcssDoc]",
          "postcssDoc && postcssDoc.constructor === require('postcss-syntax/document') ? postcssDoc.nodes : [postcssDoc]",
        ],
      ],
    }),
    copy({
      resolveFrom: 'cwd',
      assets: [
        {
          from: ['./node_modules/typescript/lib/*.d.ts'],
          to: ['./bin/'],
        },
        {
          from: ['./run-node'],
          to: ['./bin/'],
        },
        {
          from: ['./packages/jsts/src/parsers/estree.proto'],
          to: ['./bin/'],
        },
      ],
    }),
  ],
});
