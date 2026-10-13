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
import type PostCSS from 'postcss';
import selectorParser from 'postcss-selector-parser';
import valueParser from 'postcss-value-parser';

export const spatialProperties = new Set([
  'transform',
  'translate',
  'rotate',
  'scale',
  'top',
  'right',
  'bottom',
  'left',
  'inset',
  'inset-block',
  'inset-block-start',
  'inset-block-end',
  'inset-inline',
  'inset-inline-start',
  'inset-inline-end',
  'width',
  'height',
  'min-width',
  'min-height',
  'max-width',
  'max-height',
]);
export const transformProperties = new Set(['transform', 'translate', 'rotate', 'scale']);
const interactiveStates = new Set([
  ':hover',
  ':focus',
  ':focus-visible',
  ':focus-within',
  ':active',
  ':checked',
  ':target',
]);
const timingWords = new Set([
  'ease',
  'linear',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'step-start',
  'step-end',
]);
const animationWords = new Set([
  ...timingWords,
  'normal',
  'reverse',
  'alternate',
  'alternate-reverse',
  'forwards',
  'backwards',
  'both',
  'none',
  'running',
  'paused',
  'infinite',
]);
const cssWide = /^(initial|inherit|unset|revert|revert-layer|auto)$/i;
const noPreference = 'no-preference';

export type Component =
  | 'names'
  | 'animationDurations'
  | 'iterations'
  | 'playStates'
  | 'properties'
  | 'transitionDurations'
  | 'scroll';
export type Values = Partial<Record<Component, string[] | undefined>>;
export type MotionContext = { mode: 'all' | 'reduce' | 'skip'; key: string };

export function milliseconds(value: string): number | undefined {
  const match = /^([+]?(?:\d+(?:\.\d*)?|\.\d+))(ms|s)$/i.exec(value);
  if (!match) {
    return undefined;
  }
  const multiplier = match[2].toLowerCase() === 's' ? 1000 : 1;
  return Number(match[1]) * multiplier;
}

export function isLiteral(value: string): boolean {
  return !/[#$@{}\\]/.test(value) && !/\b(var|env|attr|calc|min|max|clamp)\s*\(/i.test(value);
}

function normalizedWord(value: string): string {
  const match = /^([-+]?(?:\d+(?:\.\d*)?|\.\d+))([a-z%]*)$/i.exec(value);
  if (!match) {
    return value.toLowerCase();
  }
  const number = Number(match[1]);
  return number === 0 ? '0' : `${number}${match[2].toLowerCase()}`;
}

function identityFunction(name: string, args: string[]): boolean {
  if (/^(translate(?:3d|[xyz])?|rotate[xyz]?|skew[xy]?)$/.test(name)) {
    return args.length > 0 && args.every((arg: string): boolean => arg === '0');
  }
  if (/^scale(?:3d|[xyz])?$/.test(name)) {
    return args.length > 0 && args.every((arg: string): boolean => arg === '1');
  }
  if (name === 'rotate3d') {
    return args.length === 4 && args.at(-1) === '0';
  }
  const identity = name === 'matrix' ? '1,0,0,1,0,0' : '1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1';
  return (name === 'matrix' || name === 'matrix3d') && args.join(',') === identity;
}

function normalizedTransform(name: string, args: string[]): string | undefined {
  if (identityFunction(name, args)) {
    return '';
  }
  switch (name) {
    case 'translatex':
      return `translate(${args[0]},0)`;
    case 'translatey':
      return `translate(0,${args[0]})`;
    case 'translate':
      return `translate(${args[0]},${args[1] ?? '0'})`;
    case 'scalex':
      return `scale(${args[0]},1)`;
    case 'scaley':
      return `scale(1,${args[0]})`;
    case 'scale':
      return `scale(${args[0]},${args[1] ?? args[0]})`;
    case 'rotatez':
      return `rotate(${args.join(',')})`;
    case 'skewx':
      return `skew(${args[0]},0)`;
    case 'skewy':
      return `skew(0,${args[0]})`;
    case 'skew':
      return `skew(${args[0]},${args[1] ?? '0'})`;
    case 'rotate':
    case 'rotatex':
    case 'rotatey':
    case 'translatez':
    case 'translate3d':
    case 'scalez':
    case 'scale3d':
    case 'matrix':
    case 'matrix3d':
      return `${name}(${args.join(',')})`;
    default:
      // Other functions need a computed transform evaluation.
      return undefined;
  }
}

export function normalizedSpatial(property: string, value: string): string | undefined {
  const nodes = valueParser(value).nodes.filter(
    (node: valueParser.Node): boolean => node.type !== 'space' && node.type !== 'comment',
  );
  const parts = nodes.map((node: valueParser.Node): string | undefined => {
    if (node.type !== 'function') {
      return normalizedWord(node.value);
    }
    const name = node.value.toLowerCase();
    const args = node.nodes
      .filter((arg: valueParser.Node): boolean => arg.type === 'word')
      .map((arg: valueParser.Node): string => normalizedWord(arg.value));
    return normalizedTransform(name, args);
  });
  if (parts.includes(undefined)) {
    return undefined;
  }
  const normalized = parts.filter(Boolean).join(' ');
  if (/^(inherit|revert|revert-layer|auto)$/.test(normalized)) {
    return undefined;
  }
  if (!transformProperties.has(property)) {
    return /^(initial|unset)$/.test(normalized) ? undefined : normalized;
  }
  if (!normalized || /^(none|initial|unset)$/.test(normalized)) {
    return 'identity';
  }
  const words = normalized.split(/\s+/);
  const expected = property === 'scale' ? '1' : '0';
  if (property !== 'transform' && words.every((word: string): boolean => word === expected)) {
    return 'identity';
  }
  if (property === 'rotate' && words.at(-1) === '0') {
    return 'identity';
  }
  return normalized;
}

export function spatialChanges(values: Iterable<string>): boolean {
  const known = new Set(values);
  if (known.size < 2) {
    return false;
  }
  if ([...known].some((value: string): boolean => /\bmatrix(?:3d)?\(/.test(value))) {
    // Different matrices establish motion, but comparing a matrix with another
    // representation requires evaluation. Identity is equivalent in either form.
    const representations = new Set(
      [...known]
        .filter((value: string): boolean => value !== 'identity')
        .map((value: string): string => value.replace(/\([^()]*\)/g, '()')),
    );
    return representations.size === 1;
  }
  return true;
}

/** Split only top-level commas: commas in steps(), strings, and functions stay intact. */
function splitList(value: string): string[] {
  const lists: string[] = [];
  let current = '';
  for (const node of valueParser(value).nodes) {
    if (node.type === 'div' && node.value === ',') {
      lists.push(current.trim());
      current = '';
    } else {
      current += valueParser.stringify(node);
    }
  }
  lists.push(current.trim());
  return lists;
}

function literalList(value: string): string[] | undefined {
  const values = splitList(value);
  return isLiteral(value) &&
    values.every((item: string): boolean => item.length > 0 && !cssWide.test(item))
    ? values
    : undefined;
}

type ParsedShorthand = {
  name?: string;
  duration: string;
  times: number;
  iteration: string;
  play: string;
  valid: boolean;
};

function consumeName(parsed: ParsedShorthand, name: string, quoted: boolean = false): void {
  if (parsed.name !== undefined) {
    parsed.valid = false;
    return;
  }
  parsed.name = name;
  parsed.valid &&= quoted || (!cssWide.test(name) && !name.startsWith('--'));
}

function consumeWord(parsed: ParsedShorthand, text: string, animation: boolean): void {
  if (/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(ms|s)$/i.test(text)) {
    if (parsed.times === 0) {
      parsed.duration = text;
      parsed.valid &&= milliseconds(text) !== undefined;
    }
    parsed.times++;
    parsed.valid &&= parsed.times <= 2;
    return;
  }
  if (animation && /^(\d+(?:\.\d+)?|infinite)$/i.test(text)) {
    parsed.iteration = text.toLowerCase();
    return;
  }
  const keywords = animation ? animationWords : timingWords;
  if (keywords.has(text.toLowerCase())) {
    if (text.toLowerCase() === 'paused') {
      parsed.play = 'paused';
    }
    return;
  }
  if (!animation && ['normal', 'allow-discrete'].includes(text.toLowerCase())) {
    return;
  }
  consumeName(parsed, text);
}

function parseShorthand(value: string, animation: boolean): ParsedShorthand {
  const parsed: ParsedShorthand = {
    duration: '0s',
    times: 0,
    iteration: '1',
    play: 'running',
    valid: isLiteral(value) && !cssWide.test(value.trim()),
  };
  for (const token of valueParser(value).nodes) {
    switch (token.type) {
      case 'space':
      case 'comment':
        break;
      case 'function':
        parsed.valid &&= ['steps', 'cubic-bezier', 'linear'].includes(token.value.toLowerCase());
        break;
      case 'string':
        consumeName(parsed, token.value, true);
        break;
      case 'word':
        consumeWord(parsed, token.value, animation);
        break;
      default:
        parsed.valid = false;
    }
  }
  return parsed;
}

function shorthand(value: string, animation: boolean): Values {
  const parsed = splitList(value).map((item: string): ParsedShorthand =>
    parseShorthand(item, animation),
  );
  const valid = parsed.every((item: ParsedShorthand): boolean => item.valid);
  // An empty name represents the disabling keyword, distinct from the string "none".
  const defaultName = animation ? '' : 'all';
  const names = parsed.map((item: ParsedShorthand): string => {
    if (item.name === undefined) {
      return defaultName;
    }
    return animation ? JSON.stringify(item.name) : item.name;
  });
  const durations = parsed.map((item: ParsedShorthand): string => item.duration);
  if (!animation) {
    return {
      properties: valid ? names.map((name: string): string => name.toLowerCase()) : undefined,
      transitionDurations: valid ? durations : undefined,
    };
  }
  return {
    names: valid ? names : undefined,
    animationDurations: valid ? durations : undefined,
    iterations: valid ? parsed.map((item: ParsedShorthand): string => item.iteration) : undefined,
    playStates: valid ? parsed.map((item: ParsedShorthand): string => item.play) : undefined,
  };
}

export function motionValues(declaration: PostCSS.Declaration): Values {
  const property = declaration.prop.toLowerCase().replace(/^-webkit-/, '');
  const value = declaration.value;
  switch (property) {
    case 'all': {
      const reset = /^(initial|unset)$/i.test(value.trim());
      return {
        names: reset ? [''] : undefined,
        animationDurations: reset ? ['0s'] : undefined,
        iterations: reset ? ['1'] : undefined,
        playStates: reset ? ['running'] : undefined,
        properties: reset ? ['all'] : undefined,
        transitionDurations: reset ? ['0s'] : undefined,
        scroll: reset ? ['auto'] : undefined,
      };
    }
    case 'animation':
      return shorthand(value, true);
    case 'transition':
      return shorthand(value, false);
    case 'animation-name': {
      const nodes = literalList(value);
      return {
        names: nodes?.map((item: string): string => {
          const parsed = valueParser(item).nodes;
          if (parsed.length !== 1 || !['word', 'string'].includes(parsed[0].type)) {
            return '';
          }
          const token = parsed[0];
          return token.type === 'word' && token.value.toLowerCase() === 'none'
            ? ''
            : JSON.stringify(token.value);
        }),
      };
    }
    case 'animation-duration':
      return { animationDurations: literalList(value) };
    case 'animation-iteration-count':
      return { iterations: literalList(value.toLowerCase()) };
    case 'animation-play-state':
      return { playStates: literalList(value.toLowerCase()) };
    case 'transition-property':
      return { properties: literalList(value.toLowerCase()) };
    case 'transition-duration':
      return { transitionDurations: literalList(value) };
    case 'scroll-behavior':
      return { scroll: literalList(value.toLowerCase()) };
    default:
      return {};
  }
}

function selectorList(value: string): string[] | undefined {
  if (/[{}\\]/.test(value)) {
    return undefined;
  }
  const selectors: string[] = [];
  let unresolved = false;
  try {
    selectorParser((root: selectorParser.Root): void => {
      root.walk((node: selectorParser.Node): void => {
        unresolved ||= node.type !== 'attribute' && /[$@]/.test(node.value ?? '');
      });
      root.each((selector: selectorParser.Selector): void => {
        selectors.push(selector.toString().trim());
      });
    }).processSync(value, { lossless: false });
    return unresolved ? undefined : selectors;
  } catch {
    return undefined;
  }
}

function nestedSelector(child: string, outer: string): string | undefined {
  let hasNesting = false;
  const parsed = selectorParser().astSync(child, { lossless: false });
  parsed.walkNesting((nesting: selectorParser.Nesting): void => {
    hasNesting = true;
    if (outer) {
      nesting.replaceWith(
        ...selectorParser()
          .astSync(outer)
          .first.nodes.map((node: selectorParser.Node): selectorParser.Node => node.clone()),
      );
    }
  });
  if (hasNesting && !outer) {
    return undefined;
  }
  return outer && !hasNesting ? `${outer} ${child}` : parsed.toString();
}

function expandSelectors(children: string[], parents: string[]): string[] | undefined {
  if (children.length * parents.length > 64) {
    return undefined;
  }
  const result: string[] = [];
  for (const outer of parents) {
    for (const child of children) {
      const selector = nestedSelector(child, outer);
      if (selector === undefined) {
        return undefined;
      }
      result.push(selector);
    }
  }
  return result;
}

export function resolveSelectors(
  rule: PostCSS.Rule,
  cache: Map<PostCSS.Rule, string[] | undefined>,
): string[] | undefined {
  if (cache.has(rule)) {
    return cache.get(rule);
  }
  const children = selectorList(rule.selector);
  let parent: PostCSS.Node | undefined = rule.parent;
  while (parent && parent.type !== 'rule') {
    parent = parent.parent;
  }
  const parents = parent?.type === 'rule' ? resolveSelectors(parent as PostCSS.Rule, cache) : [''];
  const resolved = children && parents ? expandSelectors(children, parents) : undefined;
  cache.set(rule, resolved);
  return resolved;
}

export function interactiveBase(selector: string): string {
  const root = selectorParser().astSync(selector, { lossless: false });
  root.walkPseudos((pseudo: selectorParser.Pseudo): void => {
    if (
      interactiveStates.has(pseudo.value) &&
      pseudo.parent?.type === 'selector' &&
      pseudo.parent.parent?.type === 'root'
    ) {
      pseudo.remove();
    }
  });
  return root.toString();
}

type MediaBranch = { kind: 'all' | 'reduce' | 'no-preference'; residual: string };

function mediaBranch(branch: string): MediaBranch | undefined {
  const negated = /^not\s+\(prefers-reduced-motion\s*:\s*(reduce|no-preference)\)$/.exec(branch);
  if (negated) {
    const kind = negated[1] === 'reduce' ? noPreference : 'reduce';
    return { kind, residual: '' };
  }
  if (/\b(not|or)\b/.test(branch) && branch.includes('prefers-reduced-motion')) {
    return undefined;
  }
  const feature = /\(prefers-reduced-motion(?:\s*:\s*(reduce|no-preference))?\)/g;
  const features = [...branch.matchAll(feature)];
  if (features.length === 0) {
    return { kind: 'all', residual: branch };
  }
  const kind = features.some((match: RegExpMatchArray): boolean => match[1] === noPreference)
    ? noPreference
    : 'reduce';
  const residual = branch
    .replace(feature, '')
    .split(/\band\b/)
    .map((part: string): string => part.trim())
    .filter(Boolean)
    .join(' and ');
  return { kind, residual };
}

function mediaContext(value: string): MotionContext {
  const branches = splitList(value).map((branch: string): MediaBranch | undefined =>
    mediaBranch(branch),
  );
  if (branches.includes(undefined)) {
    return { mode: 'skip', key: 'uncertain' };
  }
  if (branches.every((branch: MediaBranch | undefined): boolean => branch?.kind === noPreference)) {
    return { mode: 'skip', key: '' };
  }
  if (
    branches.some(
      (branch: MediaBranch | undefined): boolean => branch?.kind === 'reduce' && !branch.residual,
    )
  ) {
    return { mode: 'reduce', key: '' };
  }
  if (branches.length === 1 && branches[0]?.kind === 'reduce') {
    return { mode: 'reduce', key: `media:${branches[0].residual}` };
  }
  return { mode: 'all', key: `media:${value}` };
}

/** Only conjunctions with a known motion feature are reduced; unknown Boolean forms are skipped. */
export function motionContext(node: PostCSS.Node): MotionContext {
  const context: string[] = [];
  let mode: MotionContext['mode'] = 'all';
  for (let parent: PostCSS.Node | undefined = node.parent; parent; parent = parent.parent) {
    if (parent.type !== 'atrule') {
      continue;
    }
    // PostCSS types a parent as Container; the node type check establishes AtRule.
    const atRule = parent as PostCSS.AtRule;
    const name = atRule.name.toLowerCase();
    if (name !== 'media' && name !== 'supports') {
      return { mode: 'skip', key: 'uncertain' };
    }
    const value = atRule.params.trim().toLowerCase().replace(/\s+/g, ' ');
    const current =
      name === 'media' && value.includes('prefers-reduced-motion')
        ? mediaContext(value)
        : ({ mode: 'all', key: `${name}:${value}` } as const);
    if (current.mode === 'skip') {
      return current;
    }
    if (current.mode === 'reduce') {
      mode = 'reduce';
    }
    if (current.key) {
      context.unshift(current.key);
    }
  }
  return { mode, key: context.join('|') };
}
