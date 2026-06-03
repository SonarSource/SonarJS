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
import { extname } from 'node:path/posix';
import type { NormalizedAbsolutePath } from '../../../shared/src/helpers/files.js';
import type { JsTsLanguage } from './configuration.js';

export const DEFAULT_JS_EXTENSIONS = ['.js', '.mjs', '.cjs', '.jsx', '.vue'];
export const DEFAULT_TS_EXTENSIONS = ['.ts', '.mts', '.cts', '.tsx'];
export const DEFAULT_CSS_EXTENSIONS = ['.css', '.less', '.scss', '.sass'];
export const DEFAULT_HTML_EXTENSIONS = ['.html', '.htm', '.xhtml'];
export const DEFAULT_YAML_EXTENSIONS = ['.yml', '.yaml'];
export const DEFAULT_CSS_ADDITIONAL_EXTENSIONS = ['.vue', '.html', '.htm', '.xhtml'];

const VUE_TS_REGEX = /<script[^>]+lang=['"]ts['"][^>]*>/;

const SAM_TRANSFORM_FIELD = 'AWS::Serverless-2016-10-31';
const NODEJS_RUNTIME_REGEX = /^\s*Runtime:\s*['"]?nodejs\S*['"]?/;
const HELM_DIRECTIVE_IN_COMMENT_OR_STRING = new RegExp(
  [
    String.raw`#.*\{\{`, // {{ inside a YAML comment
    String.raw`'[^']*\{\{[^']*'`, // {{ inside a single-quoted string
    String.raw`"[^"]*\{\{[^"]*"`, // {{ inside a double-quoted string
    String.raw`\{\{[\w\s]+}}`, // actual Helm directive: {{ .Values.foo }}
  ].join('|'),
);

/**
 * File suffix configuration for determining file types.
 */
export type FileSuffixes = {
  jsSuffixes: string[];
  tsSuffixes: string[];
  cssSuffixes: string[];
  htmlSuffixes: string[];
  yamlSuffixes: string[];
  cssAdditionalSuffixes: string[];
};

export const DEFAULT_FILE_SUFFIXES: FileSuffixes = {
  jsSuffixes: DEFAULT_JS_EXTENSIONS,
  tsSuffixes: DEFAULT_TS_EXTENSIONS,
  cssSuffixes: DEFAULT_CSS_EXTENSIONS,
  htmlSuffixes: DEFAULT_HTML_EXTENSIONS,
  yamlSuffixes: DEFAULT_YAML_EXTENSIONS,
  cssAdditionalSuffixes: DEFAULT_CSS_ADDITIONAL_EXTENSIONS,
};

function isJsFile(
  filePath: NormalizedAbsolutePath,
  jsSuffixes: string[] = DEFAULT_JS_EXTENSIONS,
): boolean {
  return jsSuffixes.includes(extname(filePath).toLowerCase());
}

function isTsFile(
  filePath: NormalizedAbsolutePath,
  contents: string,
  tsSuffixes: string[] = DEFAULT_TS_EXTENSIONS,
): boolean {
  const extension = extname(filePath).toLowerCase();
  return (
    tsSuffixes.includes(extension) || (extension.endsWith('.vue') && VUE_TS_REGEX.test(contents))
  );
}

export function inferLanguage(
  explicit: JsTsLanguage | undefined,
  filePath: NormalizedAbsolutePath,
  fileContent: string,
  jsSuffixes: string[] = DEFAULT_JS_EXTENSIONS,
  tsSuffixes: string[] = DEFAULT_TS_EXTENSIONS,
): JsTsLanguage {
  if (explicit) {
    return explicit;
  }
  if (isTsFile(filePath, fileContent, tsSuffixes)) {
    return 'ts';
  }
  if (isJsFile(filePath, jsSuffixes)) {
    return 'js';
  }
  throw new Error(`Unable to infer language for file ${filePath}`);
}

export function isHtmlFile(
  filePath: NormalizedAbsolutePath,
  htmlSuffixes: string[] = DEFAULT_HTML_EXTENSIONS,
): boolean {
  return htmlSuffixes.includes(extname(filePath).toLowerCase());
}

export function isYamlFile(
  filePath: NormalizedAbsolutePath,
  contents?: string,
  yamlSuffixes: string[] = DEFAULT_YAML_EXTENSIONS,
): boolean {
  if (!yamlSuffixes.includes(extname(filePath).toLowerCase())) {
    return false;
  }
  // When contents are provided, apply the same Helm-safe + SAM template checks
  // as the Java predicate: reject Helm-unsafe {{ ... }} tokens, and require
  // both the SAM transform marker and a Node.js runtime declaration.
  if (contents == null) {
    return true;
  }

  let hasAwsTransform = false;
  let hasNodeJsRuntime = false;
  const lines = contents.split(/\r\n|\r|\n/);
  for (const line of lines) {
    if (line.includes('{{') && !HELM_DIRECTIVE_IN_COMMENT_OR_STRING.test(line)) {
      return false;
    }
    if (!hasAwsTransform && line.includes(SAM_TRANSFORM_FIELD)) {
      hasAwsTransform = true;
    }
    if (!hasNodeJsRuntime && NODEJS_RUNTIME_REGEX.test(line)) {
      hasNodeJsRuntime = true;
    }
  }
  return hasAwsTransform && hasNodeJsRuntime;
}

export function isJsTsFile(
  filePath: NormalizedAbsolutePath,
  suffixes: Pick<FileSuffixes, 'jsSuffixes' | 'tsSuffixes'> = DEFAULT_FILE_SUFFIXES,
): boolean {
  const extension = extname(filePath).toLowerCase();
  return suffixes.jsSuffixes.includes(extension) || suffixes.tsSuffixes.includes(extension);
}

export function isCssFile(
  filePath: NormalizedAbsolutePath,
  cssSuffixes: string[] = DEFAULT_CSS_EXTENSIONS,
): boolean {
  return cssSuffixes.includes(extname(filePath).toLowerCase());
}

export function isAlsoCssFile(
  filePath: NormalizedAbsolutePath,
  cssAdditionalSuffixes: string[] = DEFAULT_CSS_ADDITIONAL_EXTENSIONS,
): boolean {
  return cssAdditionalSuffixes.includes(extname(filePath).toLowerCase());
}

export function isAnalyzableFile(
  filePath: NormalizedAbsolutePath,
  suffixes: FileSuffixes = DEFAULT_FILE_SUFFIXES,
): boolean {
  return (
    isHtmlFile(filePath, suffixes.htmlSuffixes) ||
    isYamlFile(filePath, undefined, suffixes.yamlSuffixes) ||
    isJsTsFile(filePath, suffixes) ||
    isCssFile(filePath, suffixes.cssSuffixes) ||
    isAlsoCssFile(filePath, suffixes.cssAdditionalSuffixes)
  );
}
