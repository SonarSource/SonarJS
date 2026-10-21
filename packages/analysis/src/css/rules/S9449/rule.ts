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
import { knownFunctionsOf } from '../helpers/known-functions.js';
import { meta } from './meta.js';

const ruleName = meta.bindings[0].stylelintKey;
const message =
  'Specify which properties should transition so future style changes do not animate unexpectedly.';

const STYLE_AT_RULES = new Set([
  'container',
  'layer',
  'media',
  'scope',
  'starting-style',
  'supports',
]);
const CSS_WIDE_KEYWORDS = new Set(['inherit', 'initial', 'revert', 'revert-layer', 'unset']);
const DYNAMIC_FUNCTIONS = new Set(['var', 'env', 'attr']);
const TRANSITION_PROPERTY = 'transition-property';
const TRANSITION_PROPERTIES = new Set(['transition', TRANSITION_PROPERTY, 'transition-duration']);

type Target = { name: string; declaration: PostCSS.Declaration; start: number; end: number };
type State<T> = { values: T[] | undefined; important: boolean };
type Transitions = {
  targets?: State<Target>;
  durations?: State<number | undefined>;
};
type Parsed =
  | { kind: 'invalid' }
  | { kind: 'unknown' }
  | { kind: 'known'; targets: Target[]; durations: (number | undefined)[] };

const ruleImpl: stylelint.RuleBase = (): typeof checkFile => checkFile;

function checkFile(root: PostCSS.Root, result: PostcssResult): void {
  const blocks = new Set<PostCSS.Container>();
  root.walkDecls((declaration: PostCSS.Declaration): void => {
    const property = ident.decode(declaration.prop).toLowerCase();
    if (isRelevantProperty(property) && isStyle(declaration) && declaration.parent) {
      blocks.add(declaration.parent);
    }
  });
  for (const block of blocks) {
    checkBlock(block, result);
  }
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
      updateTransitions(transitions, node, lexer);
    } else if (isMixinCall(node)) {
      forgetTransitions(transitions);
    }
  }
  reportTransition(transitions.targets, transitions.durations, result);
}

/** SCSS `@include` and Less mixin calls, which may set transitions that the rule cannot see. */
function isMixinCall(node: PostCSS.ChildNode): boolean {
  // postcss-less marks mixin calls such as `.no-transition();` with `mixin: true`.
  return (
    node.type === 'atrule' &&
    (node.name.toLowerCase() === 'include' || (node as { mixin?: boolean }).mixin === true)
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
  lexer: Lexer,
): void {
  const property = ident.decode(declaration.prop).toLowerCase();
  if (!isRelevantProperty(property)) {
    return;
  }
  const parsed = parseDeclaration(declaration, property, lexer);
  if (parsed.kind === 'invalid') {
    return;
  }
  const important = Boolean(declaration.important);
  if (property !== 'transition-duration' && wins(transitions.targets, important)) {
    transitions.targets = {
      values: parsed.kind === 'known' ? parsed.targets : undefined,
      important,
    };
  }
  if (property !== TRANSITION_PROPERTY && wins(transitions.durations, important)) {
    transitions.durations = {
      values: parsed.kind === 'known' ? parsed.durations : undefined,
      important,
    };
  }
}

function isRelevantProperty(property: string): boolean {
  return TRANSITION_PROPERTIES.has(property) || property === 'all';
}

function reportTransition(
  targets: State<Target> | undefined,
  durations: State<number | undefined> | undefined,
  result: PostcssResult,
): void {
  if (!targets?.values) {
    return;
  }
  // A later `all` entry overrides every property selected by an earlier `all` entry.
  const index = targets.values.findLastIndex((target: Target): boolean => target.name === 'all');
  if (index < 0) {
    return;
  }
  const times = durations ? durations.values : [0];
  const duration = times?.[index % times.length];
  if (duration === undefined || duration <= 0) {
    return;
  }
  const target = targets.values[index];
  const valueStart =
    target.declaration.prop.length + (target.declaration.raws.between ?? ':').length;
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
  const value = raw?.value === declaration.value ? raw.raw : declaration.value;
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
          match.isType(node, 'single-transition-property') ||
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

function firstTime(
  group: CssNode[],
  property: string,
  match: LexerMatchResult,
): number | undefined {
  if (property === TRANSITION_PROPERTY) {
    return 0;
  }
  const time = group.find((node: CssNode): boolean => match.isType(node, 'time'));
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
