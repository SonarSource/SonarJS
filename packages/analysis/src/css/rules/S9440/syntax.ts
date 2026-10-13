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
  'running',
  'paused',
  'infinite',
]);
const cssWide = /^(initial|inherit|unset|revert|revert-layer|auto)$/i;

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
    return args.length === 4 && args[3] === '0';
  }
  const identity = name === 'matrix' ? '1,0,0,1,0,0' : '1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1';
  return (name === 'matrix' || name === 'matrix3d') && args.join(',') === identity;
}

export function normalizedSpatial(property: string, value: string): string {
  const nodes = valueParser(value).nodes.filter(
    (node: valueParser.Node): boolean => node.type !== 'space' && node.type !== 'comment',
  );
  const parts = nodes.map((node: valueParser.Node): string => {
    if (node.type !== 'function') {
      return normalizedWord(node.value);
    }
    const name = node.value.toLowerCase();
    const args = node.nodes
      .filter((arg: valueParser.Node): boolean => arg.type === 'word')
      .map((arg: valueParser.Node): string => normalizedWord(arg.value));
    return identityFunction(name, args) ? '' : `${name}(${args.join(',')})`;
  });
  const normalized = parts.filter(Boolean).join(' ');
  if (!transformProperties.has(property)) {
    return normalized;
  }
  if (!normalized || normalized === 'none') {
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

function consumeName(parsed: ParsedShorthand, name: string): void {
  if (parsed.name !== undefined) {
    parsed.valid = false;
    return;
  }
  parsed.name = name;
  parsed.valid &&= !cssWide.test(name) && !name.startsWith('--');
}

function consumeWord(parsed: ParsedShorthand, text: string, animation: boolean): void {
  if (/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(ms|s)$/i.test(text)) {
    if (parsed.times++ === 0) {
      parsed.duration = text;
      parsed.valid &&= milliseconds(text) !== undefined;
    }
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
        consumeName(parsed, token.value);
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
  const defaultName = animation ? 'none' : 'all';
  const names = parsed.map((item: ParsedShorthand): string => item.name ?? defaultName);
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
        names: reset ? ['none'] : undefined,
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
          return parsed.length === 1 && ['word', 'string'].includes(parsed[0].type)
            ? parsed[0].value
            : '';
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
    const kind = negated[1] === 'reduce' ? 'no-preference' : 'reduce';
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
  const kind = features.some((match: RegExpMatchArray): boolean => match[1] === 'no-preference')
    ? 'no-preference'
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
  if (
    branches.every((branch: MediaBranch | undefined): boolean => branch?.kind === 'no-preference')
  ) {
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
