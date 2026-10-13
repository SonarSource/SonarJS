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
// https://sonarsource.github.io/rspec/#/rspec/S9441/css
import stylelint, { type PostcssResult } from 'stylelint';
import type PostCSS from 'postcss';
import postcssValueParser from 'postcss-value-parser';

const ruleName = 'sonar/font-display-non-blocking';

const BLOCKING_VALUES = new Set(['auto', 'block']);
const REGEX_PATTERN = /^\/(?<source>.+)\/(?<flags>[a-z]*)$/;

export const messages = {
  missing: 'Choose a `font-display` strategy: the default may hide text while the font downloads.',
  blocking: (value: string): string =>
    `Change \`font-display\` from \`${value}\` to a non-blocking value: text can stay invisible while the font loads.`,
};

type SecondaryOptions = { ignoreFontFamilies?: string[] };
type Descriptors = {
  sources: PostCSS.Declaration[];
  display: PostCSS.Declaration | undefined;
  family: PostCSS.Declaration | undefined;
};

const ruleImpl: stylelint.RuleBase = (
  primary: unknown,
  secondaryOptions: unknown,
): ReturnType<stylelint.RuleBase> => {
  return (root: PostCSS.Root, result: PostcssResult): void => {
    const validOptions = stylelint.utils.validateOptions(
      result,
      ruleName,
      { actual: primary, possible: [true] },
      {
        actual: secondaryOptions,
        possible: { ignoreFontFamilies: [isString] },
        optional: true,
      },
    );
    if (!validOptions) {
      return;
    }
    const ignoredFamilies = toMatchers((secondaryOptions as SecondaryOptions)?.ignoreFontFamilies);

    root.walkAtRules(/^font-face$/i, (atRule: PostCSS.AtRule): void => {
      const descriptors = collectDescriptors(atRule);
      if (
        descriptors === undefined ||
        !descriptors.sources.some(isDownloadableSource) ||
        isIgnoredFamily(descriptors.family, ignoredFamilies)
      ) {
        return;
      }
      const { display } = descriptors;
      if (display === undefined) {
        stylelint.utils.report({
          ruleName,
          result,
          message: messages.missing,
          node: atRule,
          index: 0,
          endIndex: atRule.name.length + 1,
        });
        return;
      }
      const value = display.value.trim().toLowerCase();
      if (BLOCKING_VALUES.has(value)) {
        const start = display.prop.length + (display.raws.between?.length ?? 1);
        stylelint.utils.report({
          ruleName,
          result,
          message: messages.blocking(value),
          node: display,
          index: start,
          endIndex: start + display.value.length,
        });
      }
    });
  };
};

function isString(value: unknown): boolean {
  return typeof value === 'string';
}

/**
 * Collects the descriptors that matter for the rule. Returns `undefined` when the block contains
 * anything else than declarations and comments (mixins, includes, nested at-rules, ...), as the
 * effective descriptors cannot be resolved safely in that case.
 */
function collectDescriptors(atRule: PostCSS.AtRule): Descriptors | undefined {
  const descriptors: Descriptors = { sources: [], display: undefined, family: undefined };
  for (const node of atRule.nodes ?? []) {
    if (node.type === 'comment') {
      continue;
    }
    if (node.type !== 'decl') {
      return undefined;
    }
    switch (node.prop.toLowerCase()) {
      case 'src':
        descriptors.sources.push(node);
        break;
      case 'font-display':
        descriptors.display = node;
        break;
      case 'font-family':
        descriptors.family = node;
        break;
    }
  }
  return descriptors;
}

/**
 * A source is downloadable when it has a `url()` that does not embed the font in a `data:` URL.
 */
function isDownloadableSource(declaration: PostCSS.Declaration): boolean {
  let downloadable = false;
  postcssValueParser(declaration.value).walk((node: postcssValueParser.Node): void => {
    if (node.type !== 'function' || node.value.toLowerCase() !== 'url') {
      return;
    }
    const argument = node.nodes[0]?.value.trim();
    if (argument && !argument.toLowerCase().startsWith('data:')) {
      downloadable = true;
    }
  });
  return downloadable;
}

function isIgnoredFamily(
  family: PostCSS.Declaration | undefined,
  matchers: Array<(name: string) => boolean>,
): boolean {
  if (family === undefined || matchers.length === 0) {
    return false;
  }
  const name = unquote(family.value.trim());
  return matchers.some((matches: (name: string) => boolean): boolean => matches(name));
}

function unquote(value: string): string {
  const first = value.charAt(0);
  return (first === '"' || first === "'") && value.endsWith(first) && value.length > 1
    ? value.slice(1, -1)
    : value;
}

/**
 * Plain strings are compared case-insensitively, as font family names are in CSS.
 * Values written as `/pattern/flags` are regular expressions.
 */
function toMatchers(patterns: string[] | undefined): Array<(name: string) => boolean> {
  return (patterns ?? []).map((pattern: string): ((name: string) => boolean) => {
    const groups = REGEX_PATTERN.exec(pattern)?.groups;
    if (groups) {
      const regex = new RegExp(groups.source, groups.flags);
      return (name: string): boolean => regex.test(name);
    }
    const expected = pattern.toLowerCase();
    return (name: string): boolean => name.toLowerCase() === expected;
  });
}

export const rule = stylelint.createPlugin(
  ruleName,
  Object.assign(ruleImpl, {
    messages,
    ruleName,
  }),
) as { ruleName: string; rule: stylelint.Rule };
