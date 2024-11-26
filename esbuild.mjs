/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
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

await esbuild.build({
  entryPoints: ['./server.mjs'],
  outfile: './bin/server.cjs',
  format: 'cjs',
  bundle: true,
  // we mark this file as external because it does not exist on EsLint any more and in any case
  // the code never reaches this dynamic require as this is a fallback if 'eslint/use-at-your-own-risk'
  // does not exist. we need to keep an eye on this in the future.
  external: ['eslint/lib/util/glob-util'],
  platform: 'node',
  minify: true,
  plugins: [
    textReplace({
      include: /server\.mjs$/,
      pattern: [['new URL(import.meta.url)', '__filename']],
    }),
    textReplace({
      include: /lib[\/\\]jsts[\/\\]src[\/\\]parsers[\/\\]ast\.js$/,
      pattern: [['path.dirname(fileURLToPath(import.meta.url))', '__dirname']],
    }),
    // Simplify the loader function in babel. At the end it's just importing Babel parser
    // This matches the result of the TS compilation of the following lines
    // https://github.com/babel/babel/blob/v7.25.1/eslint/babel-eslint-parser/src/parse.cts#L8-L12
    textReplace({
      include: /node_modules[\/\\]@babel[\/\\]eslint-parser[\/\\]lib[\/\\]parse\.cjs$/,
      pattern: [
        [/const babelParser = require.*}\)\)/gms, 'const babelParser = require("@babel/parser")'],
      ],
    }),
    // Remove dynamic import of espree on ESLint Rule tester. In any case, it's never used in the bundle
    textReplace({
      include: /node_modules[\/\\]eslint[\/\\]lib[\/\\]rule-tester[\/\\]rule-tester\.js$/,
      pattern: [
        // https://github.com/eslint/eslint/blob/v8.57.0/lib/rule-tester/rule-tester.js#L56
        ['const espreePath = require.resolve("espree");', ''],
        // https://github.com/eslint/eslint/blob/v8.57.0/lib/rule-tester/rule-tester.js#L781
        ['config.parser = espreePath;', ''],
      ],
    }),
    // Dynamic import in module used by eslint-import-plugin. It always resolves to node resolver
    textReplace({
      include: /node_modules[\/\\]eslint-module-utils[\/\\]resolve\.js$/,
      pattern: [
        [
          // https://github.com/import-js/eslint-plugin-import/blob/v2.11.0/utils/resolve.js#L157
          'tryRequire(`eslint-import-resolver-${name}`, sourceFile)',
          'require("eslint-import-resolver-node")',
        ],
      ],
    }),
    // the html extractor for stylelint calls a "loadSyntax" function in postcss-syntax/load-syntax.js
    // That function has a dynamic require which always resolves to same dependencies given
    // our stylelint options.
    textReplace({
      include: /node_modules[\/\\]postcss-html[\/\\]extract\.js$/,
      pattern: [
        [
          //https://github.com/ota-meshi/postcss-html/blob/v0.36.0/extract.js#L108
          'style.syntax = loadSyntax(opts, __dirname);',
          `style.syntax = {
            parse: require("postcss-html/template-parse"), 
            stringify: require("postcss/lib/stringify")
          }; 
          opts.syntax.config["css"] = {
            stringify: require("postcss/lib/stringify"),
            parse: require("postcss/lib/parse")
          }`,
          // ^^ modifying "opts.syntax.config" is a side effect done in postcss-syntax/get-syntax.js
        ],
      ],
    }),
    // The comparison by constructor name made by stylelint is not valid in the bundle because
    // the Document object is named differently. We need to compare constructor object directly
    textReplace({
      include: /node_modules[\/\\]stylelint[\/\\]lib[\/\\]lintPostcssResult\.js$/,
      pattern: [
        [
          // https://github.com/stylelint/stylelint/blob/15.10.0/lib/lintPostcssResult.js#L52
          "postcssDoc && postcssDoc.constructor.name === 'Document' ? postcssDoc.nodes : [postcssDoc]",
          "postcssDoc && postcssDoc.constructor === require('postcss-syntax/document') ? postcssDoc.nodes : [postcssDoc]",
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
          to: ['./bin/'],
        },
        // We copy run-node into the bundle, as it's used from the java side on Mac
        {
          from: ['./run-node'],
          to: ['./bin/'],
        },
        // We copy the protofile as it needs to be accessible for the bundle
        {
          from: ['./packages/jsts/src/parsers/estree.proto'],
          to: ['./bin/'],
        },
      ],
    }),
  ],
});
