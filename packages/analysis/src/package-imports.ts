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
import { builtinModules } from 'node:module';
import { parseInlineNPMImport } from './jsts/rules/helpers/dependency-manifests/resolvers/npm-import.js';
import type { DependenciesList } from './jsts/rules/helpers/dependency-manifests/resolvers/types.js';

// Curated from the package-import telemetry canvas: its popularity, current, proposed, and
// runtime cohorts are kept as one deduplicated set, including deprecated-but-valid entries.
const ALLOWLIST = new Set(
  `
typescript, react, mocha, jest, react-dom, chai, lodash, chalk
axios, vue, express, commander, fs-extra, sinon, prop-types, request
moment, glob, inquirer, debug, @testing-library/react, semver, yargs, dotenv
rxjs, uuid, @storybook/react, postcss, tape, @testing-library/jest-dom, async, antd
classnames, node-fetch, mkdirp, ava, ora, minimist, react-test-renderer, shelljs
vue-router, @testing-library/user-event, jsdom, bluebird, enzyme, should, colors, styled-components
jquery, jasmine-core, body-parser, @angular/core, underscore, @angular/common, react-native, sinon-chai
react-router-dom, @angular/platform-browser, jsonwebtoken, redux, @angular/platform-browser-dynamic, @ant-design/web3-common, @ant-design/web3-icons, js-yaml
cheerio, enzyme-adapter-react-16, ws, supertest, @angular/forms, react-redux, web-vitals, bootstrap
through2, chokidar, execa, vuex, @angular/router, chai-as-promised, puppeteer, winston
graphql, aws-sdk, qs, handlebars, @angular/animations, ejs, dayjs, @storybook/testing-library
ajv, @vue/test-utils, cross-spawn, jasmine, element-ui, @emotion/styled, mongoose, deepmerge
date-fns, cors, nock, ethers, globby, yeoman-generator, @emotion/react, identity-obj-proxy
marked, q, crypto-js, tailwindcss, mongodb, ramda, highlight.js, vitest
tap, lodash-es, resolve, react-addons-test-utils, co, socket.io, react-router, @alifd/next
koa, figlet, tsconfig-paths, react-is, superagent, @angular/http, form-data, expect.js
download-git-repo, got, minimatch, @material-ui/core, tap-spec, express-validator, cookie-session, immutable
jest-environment-jsdom, xml2js, pg, acorn, socket.io-client, cookie-parser, svelte, redis
proxyquire, camelcase, morgan, request-promise, markdown-it, next, mime, fast-glob
node-notifier, expect, portfinder, http-proxy-middleware, @mui/material, mysql, joi, prompts
query-string, @nestjs/common, nanoid, @testing-library/react-hooks, react-transition-group, tmp, js-cookie, clsx
prompt, promise, compression, redux-thunk, strip-ansi, @stencil/core, bignumber.js, meow
prismjs, react-icons, echarts, yosay, lodash.merge, path-to-regexp, md5, mime-types
cypress, @ethersproject/providers, node-nats-streaming, web3, @fortawesome/fontawesome-svg-core, enzyme-to-json, history, @storybook/blocks
yaml, @material-ui/icons, lru-cache, normalize.css, tiny-invariant, @fortawesome/free-solid-svg-icons, font-awesome, inherits
moment-timezone, d3, @nestjs/core, zod, extend, benchmark, big.js, faker
nodemailer, connect-history-api-fallback, dotenv-expand, pug, cross-fetch, eventemitter3, optimist, connect
serve-static, iconv-lite, type-fest, log-symbols, discord.js, react-select, @ant-design/icons, validator
@ethersproject/address, ms, readable-stream, boxen, lodash.debounce, react-bootstrap, immer, json5
archiver, bn.js, lodash.get, invariant, mustache, node-uuid, escape-string-regexp, lit
ember-resolver, express-session, @popperjs/core, graceful-fs, file-saver, graphql-tag, find-up, vuepress
which, i18next, watch, tar, @angular/cdk, replace-in-file, yup, three
tiny-warning, jade, path-exists, sequelize, polished, yeoman-assert, mobx, firebase
async-validator, @mui/icons-material, xlsx, @storybook/node-logger, jsdom-global, concat-stream, pluralize, vue-class-component
micromatch, koa-router, progress, @fortawesome/react-fontawesome, vue-i18n, angular, yeoman-test, lodash.clonedeep
codemirror, @ethersproject/contracts, @testing-library/dom, @jest/globals, lodash.camelcase, @ethersproject/solidity, merge2, @emotion/core
ioredis, simple-git, svgo, ansi-styles, jszip, esprima, passport, browserslist
merge-stream, vue-property-decorator, ant-design-vue, fast-deep-equal, @nestjs/testing, clone, decimal.js-light, npmlog
vinyl, pify, jest-styled-components, argparse, log4js, jsonfile, lodash.isequal, mockjs
multer, function-bind, xtend, request-promise-native, ip, diff, toformat, js-beautify
react-helmet, cookie, slash, through, color, event-stream, config, safe-buffer
ansi-regex, supports-color, change-case, @storybook/theming, vuedraggable, mysql2, yargs-parser, ember-source
jsbi, styled-system, react-hook-form, power-assert, clear, markdown-it-container, deep-equal, rewire
popper.js, luxon, pino, @angular/material, lit-element, postcss-safe-parser, ember-data, class-validator
@ethersproject/networks, ini, dumi, ethereumjs-util, react-i18next, shortid, jest-extended, enquirer
readline-sync, preact, chalk-animation, element-plus, js-base64, class-transformer, arg, requirejs
pump, cli-table, @vitejs/plugin-vue-jsx, once, @vueuse/core, typeorm, adm-zip, react-intl
@sveltejs/kit, ember-ajax, https-proxy-agent, jasmine-node, hoist-non-react-statics, react-dnd, bunyan, picocolors
http-errors, @angular/platform-server, ethereum-waffle, @reduxjs/toolkit, http-proxy, markdown-it-anchor, jwt-decode, url-join
chart.js, @fortawesome/fontawesome-free, csstype, nprogress, protobufjs, knex, @nestjs/platform-express, cosmiconfig
bs58, formik, require-dir, underscore.string, react-dnd-html5-backend, throttle-debounce, clipboard, pkg-dir
lodash.throttle, get-port, fastify, node-emoji, koa-static, @storybook/react-vite, uppercamelcase, estraverse
stream-browserify, dateformat, @openzeppelin/contracts, systemjs, lolex, p-limit, amqplib, validate-npm-package-name
redux-saga, color-convert, @stdlib/bench, koa-bodyparser, strip-json-comments, framer-motion, monaco-editor, nightwatch
escodegen, reselect, mock-fs, helmet, anymatch, is-ci, @open-wc/testing, ansi-colors
nuxt, react-color, @mdx-js/react, elliptic, swiper, nunjucks, mqtt, @playwright/test
@octokit/rest, kleur, redux-logger, consola, chai-spies, lit-html, sprintf-js, read-pkg-up
unified, command-line-args, jest-fetch-mock, bcryptjs, mobx-react, sortablejs, localforage, @apollo/client
app-root-path, base64-js, xmldom, dedent, react-markdown, react-popper, @capacitor/core, tinycolor2
tough-cookie, pako, tweetnacl, vows, leaflet, acorn-jsx, braces, serve-favicon
object-hash, pretty-bytes, @solana/web3.js, serialize-javascript, is-plain-object, html2canvas, @ckeditor/ckeditor5-autoformat, @web/test-runner
numeral, url-parse, merge, parse5, mitt, @uniswap/v2-core, hapi, recompose
recursive-readdir, hammerjs, react-use, solid-js, styled-jsx, @vercel/og, satori, twin.macro
@ag-grid-community/core, karma-jasmine, qunit, @testing-library/vue, @testing-library/angular, @testing-library/svelte, @testing-library/preact, storybook
cookies, csurf, errorhandler, helmet-csp, hsts, hide-powered-by, formidable, telnet-client
ftp, jose, node-jose, ldapjs, sqlite3, better-sqlite3, mssql, oracledb
pg-promise, aws-cdk-lib, @aws-sdk/client-ses, cdk8s, cdk8s-plus-25, @pulumi/aws, @pulumi/pulumi, @cdktf/provider-aws
libxmljs, libxmljs2, extract-zip, yauzl, dompurify, isomorphic-dompurify, swig, kramed
strapi-utils, @strapi/utils, viem, tronweb, obsidian, jest-mock, @vitest/browser, @vitest/ui
@vitest/coverage-v8, @vitest/coverage-istanbul, chai-http, playwright, @playwright/experimental-ct-react, @playwright/experimental-ct-vue, @playwright/experimental-ct-svelte, @playwright/experimental-ct-solid
@cypress/react, @cypress/vue, @cypress/angular, @cypress/svelte, jasmine-browser-runner, @jasminejs/reporters, @nestjs/platform-fastify, @nestjs/config
@nestjs/swagger, @nestjs/graphql, @nestjs/microservices, @nestjs/websockets, @sveltejs/vite-plugin-svelte, @angular/compiler, @angular/elements, pinia
@vue/compiler-sfc, @vue/server-renderer, @vue/compat, vue-template-compiler, vue-server-renderer, @solidjs/router, @solidjs/start, vite-plugin-solid
babel-preset-solid, @tailwindcss/postcss, @tailwindcss/vite, @tailwindcss/cli, @tailwindcss/forms, @tailwindcss/typography, postcss-scss, postcss-js
node:assert, node:assert/strict, node:async_hooks, node:buffer, node:child_process, node:cluster, node:console, node:constants
node:crypto, node:dgram, node:diagnostics_channel, node:dns, node:dns/promises, node:domain, node:events, node:fs
node:fs/promises, node:http, node:http2, node:https, node:inspector, node:inspector/promises, node:module, node:net
node:os, node:path, node:path/posix, node:path/win32, node:perf_hooks, node:process, node:punycode, node:querystring
node:readline, node:readline/promises, node:repl, node:sea, node:sqlite, node:stream, node:stream/consumers, node:stream/promises
node:stream/web, node:string_decoder, node:sys, node:test, node:test/reporters, node:timers, node:timers/promises, node:tls
node:trace_events, node:tty, node:url, node:util, node:util/types, node:v8, node:vm, node:wasi
node:worker_threads, node:zlib, bun, bun:ffi, bun:jsc, bun:sqlite, bun:test
`
    .trim()
    .split(/[,\s]+/),
);

const RUNTIME_ALLOWLIST = new Set(
  [...ALLOWLIST].filter(
    name => name === 'bun' || name.startsWith('bun:') || name.startsWith('node:'),
  ),
);
const PACKAGE_ALLOWLIST = new Set([...ALLOWLIST].filter(name => !RUNTIME_ALLOWLIST.has(name)));
const NODE_PREFIX_ONLY_BUILTINS = new Set([
  'node:sea',
  'node:sqlite',
  'node:test',
  'node:test/reporters',
]);
const BARE_NODE_BUILTINS = new Map<string, string>();

for (const builtin of builtinModules) {
  const bare = builtin.startsWith('node:') ? builtin.slice('node:'.length) : builtin;
  const canonical = `node:${bare}`;
  if (RUNTIME_ALLOWLIST.has(canonical) && !NODE_PREFIX_ONLY_BUILTINS.has(canonical)) {
    BARE_NODE_BUILTINS.set(bare, canonical);
  }
}

const PACKAGE_NAME_PART = /^[a-z0-9][a-z0-9._~-]*$/;

/**
 * Returns only canonical, allowlisted package and runtime names used by the supplied imports.
 *
 * Ordinary packages must also be exact direct manifest keys. This limits telemetry to known
 * ecosystem names and avoids collecting private package names, local paths, or aliases.
 */
export function collectPackageImports(
  moduleSpecifiers: ReadonlySet<string>,
  dependencies: DependenciesList,
): Set<string> {
  const result = new Set<string>();

  for (const specifier of moduleSpecifiers) {
    if (RUNTIME_ALLOWLIST.has(specifier)) {
      result.add(specifier);
      continue;
    }

    const builtin = BARE_NODE_BUILTINS.get(specifier);
    if (builtin !== undefined) {
      result.add(builtin);
      continue;
    }

    const inlineNpmImport = parseInlineNPMImport(specifier);
    if (inlineNpmImport !== undefined) {
      if (PACKAGE_ALLOWLIST.has(inlineNpmImport.packageName)) {
        result.add(inlineNpmImport.packageName);
      }
      continue;
    }

    const packageName = packageRoot(specifier);
    if (
      packageName !== undefined &&
      PACKAGE_ALLOWLIST.has(packageName) &&
      dependencies.has(packageName)
    ) {
      result.add(packageName);
    }
  }

  return result;
}

function packageRoot(specifier: string): string | undefined {
  if (
    specifier.length === 0 ||
    specifier.startsWith('.') ||
    specifier.startsWith('/') ||
    specifier.startsWith('#') ||
    specifier.includes('\\') ||
    specifier.includes(':')
  ) {
    return undefined;
  }

  const segments = specifier.split('/');
  const rootLength = specifier.startsWith('@') ? 2 : 1;
  const rootSegments = segments.slice(0, rootLength);
  const subpathSegments = segments.slice(rootLength);

  if (
    rootSegments.length !== rootLength ||
    !rootSegments.every((part, index) =>
      PACKAGE_NAME_PART.test(index === 0 && part.startsWith('@') ? part.slice(1) : part),
    ) ||
    subpathSegments.some(part => part === '' || part === '.' || part === '..')
  ) {
    return undefined;
  }

  return rootSegments.join('/');
}
