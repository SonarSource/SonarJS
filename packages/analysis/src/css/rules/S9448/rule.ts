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
// https://sonarsource.github.io/rspec/#/rspec/S9448/css
import stylelint, { type PostcssResult } from 'stylelint';
import type PostCSS from 'postcss';
import type { Lexer } from 'css-tree';
import { isTokenOpenCurly, tokenize, type CSSToken } from '@csstools/css-tokenizer';
import {
  isFunctionNode,
  isSimpleBlockNode,
  parseListOfComponentValues,
  type ComponentValue,
} from '@csstools/css-parser-algorithms';
import cssFunctions from 'css-functions-list/index.json' with { type: 'json' };
import { knownFunctionsOf } from '../helpers/known-functions.js';
import { isLegacyIeFilter, VENDOR_PREFIX } from '../helpers/legacy-syntax.js';

// Stylelint's `function-no-unknown` is not decorated: it skips any value containing braces, even
// inside strings, and locates issues on the comment-stripped value, which a decorator cannot fix.
const ruleName = 'sonar/function-no-unknown';

const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: (name: string) => `Replace this unknown "${name}" function with a known CSS function.`,
});

// Standard functions that neither css-functions-list nor the css-tree grammar define yet
const MISSING_STANDARD_FUNCTIONS = ['container-progress', 'media-progress', 'toggle'];

// `constant()` is the iOS 11.0 spelling of `env()`, still written as a fallback before it
const COMPATIBILITY_FUNCTIONS = ['constant'];

const KNOWN_FUNCTIONS = new Set([
  ...cssFunctions.map((name: string) => name.toLowerCase()),
  ...MISSING_STANDARD_FUNCTIONS,
  ...COMPATIBILITY_FUNCTIONS,
]);

// Vue single-file components bind component state to style values with `v-bind()`
const VUE_FUNCTION = 'v-bind';
const VUE_FILE = /\.vue$/i;

// Functions whose arguments are a condition to test rather than values, as in `if(style(...): ...)`
const CONDITION_FUNCTIONS = new Set(['style', 'supports']);

// Prefix of custom properties and custom functions
const DASHED_PREFIX = '--';
const REGEX_OPTION = /^\/(.+)\/([a-z]*)$/;

type Options = { ignoreFunctions?: string[] };

type UnknownFunction = { name: string; nameToken: CSSToken };

const ruleImpl: stylelint.RuleBase = (primary: unknown, secondaryOptions: unknown) => {
  return (root: PostCSS.Root, result: PostcssResult) => {
    const validOptions = stylelint.utils.validateOptions(
      result,
      ruleName,
      { actual: primary },
      {
        actual: secondaryOptions,
        possible: { ignoreFunctions: [(value: unknown) => typeof value === 'string'] },
        optional: true,
      },
    );
    if (!validOptions) {
      return;
    }
    const ignoreFunctions = (secondaryOptions as Options | undefined)?.ignoreFunctions ?? [];
    const isVueFile = VUE_FILE.test(result.opts.from ?? '');
    const isIgnored = ignoreMatcher(
      isVueFile ? [...ignoreFunctions, VUE_FUNCTION] : ignoreFunctions,
    );
    const lexer = result.stylelint.lexer as Lexer;
    const lexerFunctions = knownFunctionsOf(lexer);

    root.walkDecls((decl: PostCSS.Declaration) => {
      if (isSkippedDeclaration(decl, lexer)) {
        return;
      }
      const value = decl.raws.value?.raw ?? decl.value;
      const tokens = tokenize({ css: value });
      // braces outside strings and URLs are template or preprocessor interpolation
      if (tokens.some(isTokenOpenCurly)) {
        return;
      }
      const valueIndex = declarationValueIndex(decl);
      const nodes = parseListOfComponentValues(tokens);
      for (const { name, nameToken } of unknownFunctions(nodes, lexerFunctions, isIgnored)) {
        // the function token ends on its opening parenthesis, which the exclusive end leaves out
        const [, , start, end] = nameToken;
        stylelint.utils.report({
          ruleName,
          result,
          message: messages.rejected(name),
          node: decl,
          index: valueIndex + start,
          endIndex: valueIndex + end,
        });
      }
    });
  };
};

function isSkippedDeclaration(decl: PostCSS.Declaration, lexer: Lexer): boolean {
  return (
    // custom property values are opaque until substituted with `var()`
    decl.prop.startsWith(DASHED_PREFIX) || isLegacyIeFilter(decl) || isDescriptor(decl, lexer)
  );
}

/**
 * At-rule descriptor values, such as `src` in `@font-face`, are validated by S8775.
 */
function isDescriptor(decl: PostCSS.Declaration, lexer: Lexer): boolean {
  for (let node: PostCSS.Node | undefined = decl.parent; node; node = node.parent) {
    if (
      node.type === 'atrule' &&
      lexer.checkAtruleDescriptorName((node as PostCSS.AtRule).name, decl.prop) === undefined
    ) {
      return true;
    }
  }
  return false;
}

function unknownFunctions(
  nodes: ComponentValue[],
  lexerFunctions: Set<string>,
  isIgnored: (name: string) => boolean,
  found: UnknownFunction[] = [],
): UnknownFunction[] {
  for (const node of nodes) {
    if (isFunctionNode(node)) {
      const name = node.getName();
      const lowerName = name.toLowerCase();
      if (!isKnown(lowerName, lexerFunctions) && !isIgnored(name)) {
        found.push({ name, nameToken: node.name });
      }
      if (!CONDITION_FUNCTIONS.has(lowerName)) {
        unknownFunctions(node.value, lexerFunctions, isIgnored, found);
      }
    } else if (isSimpleBlockNode(node)) {
      unknownFunctions(node.value, lexerFunctions, isIgnored, found);
    }
  }
  return found;
}

function isKnown(lowerName: string, lexerFunctions: Set<string>): boolean {
  const unprefixed = lowerName.replace(VENDOR_PREFIX, '');
  return (
    lowerName.startsWith(DASHED_PREFIX) ||
    KNOWN_FUNCTIONS.has(lowerName) ||
    KNOWN_FUNCTIONS.has(unprefixed) ||
    lexerFunctions.has(unprefixed)
  );
}

/**
 * Matches function names against strings, compared case-insensitively, and `/regex/flags` patterns.
 */
function ignoreMatcher(patterns: string[]): (name: string) => boolean {
  const matchers = patterns.map((pattern: string): ((name: string) => boolean) => {
    const regex = REGEX_OPTION.exec(pattern);
    if (regex) {
      try {
        const compiled = new RegExp(regex[1], regex[2]);
        return (name: string) => compiled.test(name);
      } catch {
        // not a valid regular expression, so it is matched as a plain name
      }
    }
    const lowerPattern = pattern.toLowerCase();
    return (name: string) => name.toLowerCase() === lowerPattern;
  });
  return (name: string) => matchers.some(matches => matches(name));
}

function declarationValueIndex(decl: PostCSS.Declaration): number {
  return decl.prop.length + (decl.raws.between ?? ':').length;
}

export const rule = stylelint.createPlugin(
  ruleName,
  Object.assign(ruleImpl, {
    messages,
    ruleName,
  }),
) as { ruleName: string; rule: stylelint.Rule };
