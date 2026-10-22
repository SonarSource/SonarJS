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
// https://sonarsource.github.io/rspec/#/rspec/S9449/css
import stylelint, { type PostcssResult } from 'stylelint';
import type PostCSS from 'postcss';
import { ident, parse, walk, type CssNode, type Lexer, type LexerMatchResult } from 'css-tree';
import { CSS_WIDE_KEYWORDS, declarationValueIndex } from '../helpers/declaration.js';
import { asSpaces } from '../helpers/irregular-whitespaces.js';
import { knownFunctionsOf } from '../helpers/known-functions.js';
import { meta } from './meta.js';

const ruleName = meta.bindings[0].stylelintKey;
const message =
  'Specify which properties should transition so future style changes do not animate unexpectedly.';

const STYLE_AT_RULES = new Set([
  'at-root',
  'container',
  'layer',
  'media',
  'scope',
  'starting-style',
  'supports',
]);
const DYNAMIC_FUNCTIONS = new Set(['var', 'env', 'attr']);
const TRANSITION_PROPERTY = 'transition-property';
// The transition lists that each property sets. `all` resets both to values the rule cannot read.
const SLOTS = new Map<string, Slot[]>([
  ['transition', ['targets', 'durations']],
  ['all', ['targets', 'durations']],
  [TRANSITION_PROPERTY, ['targets']],
  ['transition-duration', ['durations']],
]);
// A block without `transition-duration` transitions for the default `0s`.
const INITIAL_DURATIONS = [0];
// css-tree grammar types of a transition target and of a duration
const TRANSITION_TARGET_TYPE = 'single-transition-property';
const TIME_TYPE = 'time';
// Vue `<Transition>` classes, such as `.fade-leave-active` or `&-enter-from`, which only apply
// while an element enters or leaves. react-transition-group `-enter-active` classes match only
// because they share the Vue suffix, while its other classes, such as `-exit-active`, are reported.
const VUE_TRANSITION_CLASS = /(?:\.[\w-]+|&[\w-]*)-(?:enter|leave)-(?:active|from|to)(?![\w-])/;
// A negated class applies outside of the transition, so it does not make a rule transient.
const NEGATION = /:not\([^)]*\)/gi;

type Slot = 'targets' | 'durations';
type Target = { name: string; declaration: PostCSS.Declaration; start: number; end: number };
/** `values` is `undefined` when the state is overridden by a value that the rule cannot read. */
type State<T> = { values: T[] | undefined; important: boolean };
type Transitions = {
  targets?: State<Target>;
  durations?: State<number | undefined>;
};
/**
 * - `invalid`: the browser drops the declaration, so the previous state is kept.
 * - `unknown`: the declaration overrides the state, but its value cannot be read.
 * - `known`: the declaration sets the state to these values.
 */
type Parsed =
  | { kind: 'invalid' }
  | { kind: 'unknown' }
  | { kind: 'known'; targets: Target[]; durations: (number | undefined)[] };

const ruleImpl: stylelint.RuleBase = (): typeof checkFile => checkFile;

function checkFile(root: PostCSS.Root, result: PostcssResult): void {
  const blocks = new Set<PostCSS.Container>();
  root.walkDecls((declaration: PostCSS.Declaration): void => {
    if (SLOTS.has(propertyName(declaration)) && isStyle(declaration) && declaration.parent) {
      blocks.add(declaration.parent);
    }
  });
  for (const block of blocks) {
    if (!isVueTransitionRule(block)) {
      checkBlock(block, result);
    }
  }
}

function propertyName(declaration: PostCSS.Declaration): string {
  return ident.decode(declaration.prop).toLowerCase();
}

/** Vue applies transition classes only during the transition, so `all` cannot leak into later changes. */
function isVueTransitionRule(block: PostCSS.Container): boolean {
  const rule = enclosingRule(block);
  return (
    rule !== undefined &&
    rule.selectors.every((selector: string): boolean =>
      VUE_TRANSITION_CLASS.test(selector.replaceAll(NEGATION, '')),
    )
  );
}

/** The block itself, or the rule around a nested at-rule such as `@media`. */
function enclosingRule(block: PostCSS.Container): PostCSS.Rule | undefined {
  for (
    let node: PostCSS.Container | PostCSS.Document | undefined = block;
    node;
    node = node.parent
  ) {
    if (node.type === 'rule') {
      // Guarded by the PostCSS node discriminator.
      return node as PostCSS.Rule;
    }
  }
  return undefined;
}

/**
 * Match S9424's conservative descriptor filtering, also excluding non-animatable keyframe content.
 * Preprocessor at-rules such as `@mixin`, `@include`, and `@if` are deliberately skipped too.
 */
function isStyle(declaration: PostCSS.Declaration): boolean {
  let hasRule = false;
  for (
    let node: PostCSS.Container | PostCSS.Document | undefined = declaration.parent;
    node;
    node = node.parent
  ) {
    if (node.type === 'rule') {
      hasRule = true;
    }
    if (node.type === 'atrule') {
      // Guarded by the PostCSS node discriminator.
      const name = (node as PostCSS.AtRule).name.toLowerCase();
      if (!STYLE_AT_RULES.has(name)) {
        return false;
      }
    }
  }
  return hasRule;
}

function checkBlock(block: PostCSS.Container, result: PostcssResult): void {
  const transitions: Transitions = {};
  const lexer = result.stylelint.lexer as Lexer;
  for (const node of block.nodes ?? []) {
    if (node.type === 'decl') {
      updateTransitions(transitions, node, propertyName(node), lexer);
    } else if (isMixinCall(node)) {
      forgetTransitions(transitions);
    }
  }
  reportTransition(transitions.targets, transitions.durations, result);
}

/** SCSS `@include` and Less mixin calls, which may set transitions that the rule cannot see. */
function isMixinCall(node: PostCSS.ChildNode): boolean {
  return node.type === 'atrule' && (node.name.toLowerCase() === 'include' || isLessMixinCall(node));
}

/**
 * Less mixin calls such as `.no-transition();`, which postcss-less marks with `mixin: true`, and
 * Less detached ruleset calls such as `@motion();`, which have empty parameters and no body.
 */
function isLessMixinCall(node: PostCSS.AtRule): boolean {
  return (
    (node as { mixin?: boolean }).mixin === true ||
    (node.params.trim() === '()' && node.nodes === undefined)
  );
}

/** A mixin call may override earlier transitions unless they are `!important`. */
function forgetTransitions(transitions: Transitions): void {
  if (!transitions.targets?.important) {
    transitions.targets = { values: undefined, important: false };
  }
  if (!transitions.durations?.important) {
    transitions.durations = { values: undefined, important: false };
  }
}

function updateTransitions(
  transitions: Transitions,
  declaration: PostCSS.Declaration,
  property: string,
  lexer: Lexer,
): void {
  const slots = SLOTS.get(property);
  if (slots === undefined) {
    return;
  }
  const parsed = parseDeclaration(declaration, property, lexer);
  if (parsed.kind === 'invalid') {
    return;
  }
  const important = Boolean(declaration.important);
  if (slots.includes('targets') && wins(transitions.targets, important)) {
    transitions.targets = {
      values: parsed.kind === 'known' ? parsed.targets : undefined,
      important,
    };
  }
  if (slots.includes('durations') && wins(transitions.durations, important)) {
    transitions.durations = {
      values: parsed.kind === 'known' ? parsed.durations : undefined,
      important,
    };
  }
}

function reportTransition(
  targets: State<Target> | undefined,
  durations: State<number | undefined> | undefined,
  result: PostcssResult,
): void {
  // Without `transition-property` in the block, the property is not treated as its default `all`,
  // because another rule may set it for the same element.
  if (!targets?.values) {
    return;
  }
  // A later `all` entry overrides every property selected by an earlier `all` entry.
  const index = targets.values.findLastIndex((target: Target): boolean => target.name === 'all');
  if (index < 0) {
    return;
  }
  const times = durations ? durations.values : INITIAL_DURATIONS;
  const duration = times?.[index % times.length];
  if (duration === undefined || duration <= 0) {
    return;
  }
  const target = targets.values[index];
  const valueStart = declarationValueIndex(target.declaration);
  stylelint.utils.report({
    ruleName,
    result,
    message,
    node: target.declaration,
    index: valueStart + target.start,
    endIndex: valueStart + target.end,
  });
}

function wins<T>(state: State<T> | undefined, important: boolean): boolean {
  return state === undefined || important || !state.important;
}

function parseDeclaration(
  declaration: PostCSS.Declaration,
  property: string,
  lexer: Lexer,
): Parsed {
  const raw = declaration.raws.value;
  const value = asSpaces(raw?.value === declaration.value ? raw.raw : declaration.value);
  // Substitution may introduce additional tokens or list entries, so do not parse a partial value.
  if (/[$@]|#\{/.test(value)) {
    return { kind: 'unknown' };
  }
  let ast: CssNode;
  try {
    ast = parse(value, { context: 'value', positions: true });
  } catch {
    return { kind: 'invalid' };
  }
  if (ast.type !== 'Value') {
    return { kind: 'invalid' };
  }
  const nodes = ast.children.toArray();
  if (
    nodes.length === 1 &&
    nodes[0].type === 'Identifier' &&
    CSS_WIDE_KEYWORDS.has(ident.decode(nodes[0].name).toLowerCase())
  ) {
    return { kind: 'unknown' };
  }
  let dynamic = false;
  const knownFunctions = knownFunctionsOf(lexer);
  walk(ast, (node: CssNode): void => {
    if (node.type === 'Function') {
      const name = ident.decode(node.name).toLowerCase();
      if (DYNAMIC_FUNCTIONS.has(name) || !knownFunctions.has(name)) {
        dynamic = true;
      }
    }
  });
  if (dynamic) {
    return { kind: 'unknown' };
  }
  const match = lexer.matchProperty(property, ast);
  if (match.error) {
    return { kind: 'invalid' };
  }
  if (property === 'all') {
    return { kind: 'unknown' };
  }
  return parseGroups(declaration, property, nodes, match);
}

function splitGroups(nodes: CssNode[]): CssNode[][] {
  let group: CssNode[] = [];
  const groups = [group];
  for (const node of nodes) {
    if (node.type === 'Operator' && node.value === ',') {
      group = [];
      groups.push(group);
    } else {
      group.push(node);
    }
  }
  return groups;
}

function parseGroups(
  declaration: PostCSS.Declaration,
  property: string,
  nodes: CssNode[],
  match: LexerMatchResult,
): Parsed {
  const groups = splitGroups(nodes);
  const targets: Target[] = [];
  const durations: (number | undefined)[] = [];
  for (const group of groups) {
    const targetNode = group.find((node: CssNode): boolean => {
      return (
        node.type === 'Identifier' &&
        (property === TRANSITION_PROPERTY ||
          match.isType(node, TRANSITION_TARGET_TYPE) ||
          ident.decode(node.name).toLowerCase() === 'none')
      );
    });
    const targetName =
      targetNode?.type === 'Identifier' ? ident.decode(targetNode.name).toLowerCase() : 'all';
    if (targetName === 'none' && groups.length > 1) {
      return { kind: 'invalid' };
    }
    const start = (targetNode ?? group[0])?.loc?.start.offset;
    const end = (targetNode ?? group.at(-1))?.loc?.end.offset;
    if (start === undefined || end === undefined) {
      return { kind: 'unknown' };
    }
    targets.push({
      name: targetName,
      declaration,
      start,
      end,
    });
    const time = firstTime(group, property, match);
    if (time !== undefined && time < 0) {
      return { kind: 'invalid' };
    }
    durations.push(time);
  }
  return { kind: 'known', targets, durations };
}

/**
 * The duration of a list entry in seconds or milliseconds, `0` when the entry has none, such as a
 * `transition-property` entry, `undefined` when it cannot be resolved, and negative when invalid.
 */
function firstTime(
  group: CssNode[],
  property: string,
  match: LexerMatchResult,
): number | undefined {
  if (property === TRANSITION_PROPERTY) {
    return 0;
  }
  const time = group.find((node: CssNode): boolean => match.isType(node, TIME_TYPE));
  if (time === undefined) {
    return 0;
  }
  if (time.type !== 'Dimension') {
    return undefined;
  }
  const value = Number(time.value);
  return Number.isFinite(value) ? value : undefined;
}

export const rule = stylelint.createPlugin(
  ruleName,
  Object.assign(ruleImpl, { ruleName, messages: { rejected: message } }),
) as { ruleName: string; rule: stylelint.Rule };
