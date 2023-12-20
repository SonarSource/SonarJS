import * as path from 'path';

const HTML_EXTENSIONS = ['.html', '.htm'];
const YAML_EXTENSIONS = ['.yml', '.yaml'];
const JS_EXTENSIONS = [
  '.js',
  '.mjs',
  '.cjs',
  '.jsx',
  '.vue',
  ...HTML_EXTENSIONS,
  ...YAML_EXTENSIONS,
];
const TS_EXTENSIONS = ['.ts', '.mts', '.cts', '.tsx'];

export function isHtmlFile(filePath: string) {
  return HTML_EXTENSIONS.includes(path.posix.extname(filePath).toLowerCase());
}

export function isYamlFile(filePath: string) {
  return YAML_EXTENSIONS.includes(path.posix.extname(filePath).toLowerCase());
}

export function isJsFile(filePath: string) {
  return JS_EXTENSIONS.includes(path.posix.extname(filePath).toLowerCase());
}

export function isTsFile(filePath: string) {
  return TS_EXTENSIONS.includes(path.posix.extname(filePath).toLowerCase());
}
