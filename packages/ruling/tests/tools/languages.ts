import * as path from 'path';

const JS_EXTENSIONS = ['.js', '.mjs', '.cjs', '.jsx', '.vue', '.html', '.htm', '.yml', '.yaml'];
const TS_EXTENSIONS = ['.ts', '.mts', '.cts', '.tsx'];

export function isJsFile(filePath: string) {
  return JS_EXTENSIONS.includes(path.posix.extname(filePath).toLowerCase());
}

export function isTsFile(filePath: string) {
  return TS_EXTENSIONS.includes(path.posix.extname(filePath).toLowerCase());
}
