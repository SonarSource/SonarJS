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
// https://sonarsource.github.io/rspec/#/rspec/S9440/css
import stylelint, { type PostcssResult } from 'stylelint';
import type PostCSS from 'postcss';
import {
  interactiveBase,
  isLiteral,
  milliseconds,
  motionContext,
  motionValues,
  resolveSelectors,
  spatialProperties,
  transformProperties,
  normalizedSpatial,
  type Component,
  type MotionContext,
} from './syntax.js';

const ruleName = 'sonar/motion-reduced';
const keyframesName = /^(-webkit-)?keyframes$/i;
const initial: Record<Component, string[]> = {
  names: ['none'],
  animationDurations: ['0s'],
  iterations: ['1'],
  playStates: ['running'],
  properties: ['all'],
  transitionDurations: ['0s'],
  scroll: ['auto'],
};
export const messages = {
  motion: 'Respect reduced-motion preferences here to avoid triggering motion sensitivity.',
};
type Field = { values: string[] | undefined; declaration: PostCSS.Declaration; order: number };
type State = Partial<Record<Component, Field>>;
type Entry = {
  selector: string;
  context: MotionContext;
  declaration: PostCSS.Declaration;
  order: number;
};
type Group = { selector: string; context: string; entries: Entry[] };
type SelectorException = string | RegExp;
type GroupIndex = Map<string, Group[]>;

function values(state: State, component: Component): string[] | undefined {
  return component in state ? state[component]?.values : initial[component];
}

function apply(state: State, entry: Entry, global = false): void {
  for (const [name, value] of Object.entries(motionValues(entry.declaration))) {
    const component = name as Component;
    const previous = state[component];
    // A universal selector cannot beat a more specific important declaration.
    if (
      (global && (!entry.declaration.important || previous?.declaration.important)) ||
      (previous?.declaration.important && !entry.declaration.important)
    ) {
      continue;
    }
    state[component] = { values: value, declaration: entry.declaration, order: entry.order };
  }
}

function enabledBy(
  state: State,
  first: Component,
  second?: Component,
): PostCSS.Declaration | undefined {
  const left = state[first];
  const right = second ? state[second] : undefined;
  return right && (!left || right.order > left.order) ? right.declaration : left?.declaration;
}

function inKeyframes(node: PostCSS.Node): boolean {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (parent.type === 'atrule' && keyframesName.test((parent as PostCSS.AtRule).name)) {
      return true;
    }
  }
  return false;
}

function keyframes(root: PostCSS.Root): Map<string, boolean | undefined> {
  const frames = new Map<string, boolean | undefined>();
  const ambiguous = new Set<string>();
  root.walkAtRules(keyframesName, (frame: PostCSS.AtRule): void => {
    const name = frame.params.replace(/^(['"])(.*)\1$/, '$2');
    if (frame.parent?.type !== 'root' || !isLiteral(name)) {
      ambiguous.add(name);
      return;
    }
    const properties = new Map<string, Map<string, string>>();
    let unresolved = false;
    frame.walkDecls((declaration: PostCSS.Declaration): void => {
      const property = declaration.prop.toLowerCase().replace(/^-webkit-/, '');
      if (!spatialProperties.has(property) || declaration.important) {
        return;
      }
      if (!isLiteral(declaration.value)) {
        unresolved = true;
      }
      const known = properties.get(property) ?? new Map<string, string>();
      if (declaration.parent?.type !== 'rule') {
        unresolved = true;
        return;
      }
      for (const step of declaration.parent.selector.split(',')) {
        known.set(
          step
            .trim()
            .replace(/^from$/i, '0%')
            .replace(/^to$/i, '100%'),
          normalizedSpatial(property, declaration.value),
        );
      }
      properties.set(property, known);
    });
    frames.set(
      name,
      unresolved
        ? undefined
        : [...properties.values()].some(
            (propertyValues: Map<string, string>): boolean =>
              new Set(propertyValues.values()).size > 1,
          ),
    );
  });
  for (const name of ambiguous) {
    frames.set(name, undefined);
  }
  return frames;
}

function collect(root: PostCSS.Root): {
  groups: Map<string, Group>;
  globals: Entry[];
  uncertain: Set<string>;
} {
  const groups = new Map<string, Group>();
  const globals: Entry[] = [];
  const uncertain = new Set<string>();
  const selectors = new Map<PostCSS.Rule, string[] | undefined>();
  let order = 0;
  root.walkDecls((declaration: PostCSS.Declaration): void => {
    order++;
    if (declaration.parent?.type !== 'rule' || inKeyframes(declaration)) {
      return;
    }
    const resolved = resolveSelectors(declaration.parent, selectors);
    if (!resolved) {
      return;
    }
    const context = motionContext(declaration);
    for (const selector of resolved) {
      if (context.mode === 'skip') {
        // Known no-preference guards are safe; unknown conditional contexts are not evidence.
        if (
          context.key === 'uncertain' &&
          (Object.keys(motionValues(declaration)).length > 0 ||
            spatialProperties.has(declaration.prop))
        ) {
          uncertain.add(selector);
        }
        continue;
      }
      const key = `${selector}\n${context.key}`;
      const group = groups.get(key) ?? { selector, context: context.key, entries: [] };
      const entry = { selector, context, declaration, order };
      group.entries.push(entry);
      groups.set(key, group);
      if (
        context.mode === 'reduce' &&
        /^\*(::before|::after)?$/.test(selector) &&
        declaration.important
      ) {
        globals.push(entry);
      }
    }
  });
  return { groups, globals, uncertain };
}

function universalMatches(universal: string, selector: string): boolean {
  const pseudo = /::(before|after)$/.exec(selector);
  return pseudo ? universal === `*::${pseudo[1]}` : universal === '*' && !selector.includes('::');
}

function reducedState(group: Group, globals: Entry[]): State {
  const state: State = {};
  const entries = [
    ...group.entries,
    ...globals.filter(
      (entry: Entry): boolean =>
        entry.context.key === group.context && universalMatches(entry.selector, group.selector),
    ),
  ].sort((a: Entry, b: Entry): number => a.order - b.order);
  for (const entry of entries) {
    apply(state, entry, entry.selector !== group.selector);
  }
  return state;
}

function durationReduced(group: Group, state: State, component: Component): boolean {
  const baseline: State = {};
  for (const entry of group.entries) {
    if (entry.context.mode === 'all') {
      apply(baseline, entry);
    }
  }
  const before = values(baseline, component);
  const after = values(state, component);
  // The ticket accepts substantial reductions, but specifies no perceptual threshold.
  // A smaller positive duration is uncertain rather than a proven violation.
  return Boolean(
    before &&
    after &&
    after.every((duration: string, index: number): boolean => {
      const oldDuration = milliseconds(before[index % before.length]);
      const newDuration = milliseconds(duration);
      return oldDuration !== undefined && newDuration !== undefined && newDuration < oldDuration;
    }),
  );
}

function transitionChanges(group: Group, property: string, groups: GroupIndex): boolean {
  const base = interactiveBase(group.selector);
  const found = new Set<string>();
  let unresolved = false;
  const related = groups.get(`${base}\n${group.context}`) ?? [];
  let hasInteractiveTarget = false;
  for (const other of related) {
    let effective: PostCSS.Declaration | undefined;
    for (const entry of other.entries) {
      if (
        entry.declaration.prop.toLowerCase() === property &&
        (!effective?.important || entry.declaration.important)
      ) {
        effective = entry.declaration;
      }
    }
    if (effective) {
      hasInteractiveTarget ||= other.selector !== base;
      unresolved ||= !isLiteral(effective.value);
      found.add(normalizedSpatial(property, effective.value));
    }
  }
  if (transformProperties.has(property) && hasInteractiveTarget && found.size === 1) {
    found.add('identity');
  }
  return !unresolved && found.size > 1;
}

function motionDeclarations(
  group: Group,
  state: State,
  groups: GroupIndex,
  frames: Map<string, boolean | undefined>,
): PostCSS.Declaration[] {
  const declarations: PostCSS.Declaration[] = [];
  const names = values(state, 'names');
  const animationDurations = values(state, 'animationDurations');
  const iterations = values(state, 'iterations');
  const playStates = values(state, 'playStates');
  if (
    names &&
    animationDurations &&
    iterations &&
    playStates &&
    !durationReduced(group, state, 'animationDurations') &&
    names.some(
      (name: string, index: number): boolean =>
        frames.get(name) === true &&
        (milliseconds(animationDurations[index % animationDurations.length]) ?? 0) > 0 &&
        (iterations[index % iterations.length] === 'infinite' ||
          Number(iterations[index % iterations.length]) > 0) &&
        playStates[index % playStates.length] !== 'paused',
    )
  ) {
    const declaration = enabledBy(state, 'names', 'animationDurations');
    if (declaration) {
      declarations.push(declaration);
    }
  }
  const properties = values(state, 'properties');
  const transitionDurations = values(state, 'transitionDurations');
  if (
    properties &&
    transitionDurations &&
    !durationReduced(group, state, 'transitionDurations') &&
    properties.some(
      (property: string, index: number): boolean =>
        spatialProperties.has(property) &&
        (milliseconds(transitionDurations[index % transitionDurations.length]) ?? 0) > 0 &&
        transitionChanges(group, property, groups),
    )
  ) {
    const declaration = enabledBy(state, 'properties', 'transitionDurations');
    if (declaration) {
      declarations.push(declaration);
    }
  }
  if (values(state, 'scroll')?.[0] === 'smooth') {
    const declaration = enabledBy(state, 'scroll');
    if (declaration) {
      declarations.push(declaration);
    }
  }
  return declarations;
}

function exceptions(options: unknown): SelectorException[] | undefined {
  if (options === undefined) {
    return [];
  }
  if (!options || typeof options !== 'object') {
    return undefined;
  }
  if (!('ignoreSelectors' in options)) {
    return [];
  }
  const list = options.ignoreSelectors;
  if (!Array.isArray(list)) {
    return undefined;
  }
  const parsed: SelectorException[] = [];
  for (const value of list) {
    if (typeof value !== 'string') {
      return undefined;
    }
    try {
      parsed.push(
        value.startsWith('/') && value.endsWith('/') ? new RegExp(value.slice(1, -1)) : value,
      );
    } catch {
      return undefined;
    }
  }
  return parsed;
}

function analyze(root: PostCSS.Root, result: PostcssResult, ignored: SelectorException[]): void {
  const frames = keyframes(root);
  const { groups, globals, uncertain } = collect(root);
  const bySelector: GroupIndex = new Map();
  const byInteractiveBase: GroupIndex = new Map();
  for (const group of groups.values()) {
    const selectorGroups = bySelector.get(group.selector) ?? [];
    selectorGroups.push(group);
    bySelector.set(group.selector, selectorGroups);
    const key = `${interactiveBase(group.selector)}\n${group.context}`;
    const stateGroups = byInteractiveBase.get(key) ?? [];
    stateGroups.push(group);
    byInteractiveBase.set(key, stateGroups);
  }
  const reported = new Set<PostCSS.Declaration>();
  for (const group of groups.values()) {
    if (
      uncertain.has(group.selector) ||
      ignored.some((exception: SelectorException): boolean =>
        typeof exception === 'string'
          ? exception === group.selector
          : exception.test(group.selector),
      )
    ) {
      continue;
    }
    // A conditional same-selector reduction needs broader cascade knowledge.
    if (
      (bySelector.get(group.selector) ?? []).some(
        (other: Group): boolean =>
          other.context !== group.context &&
          other.entries.some(
            (entry: Entry): boolean =>
              entry.context.mode === 'reduce' &&
              Object.keys(motionValues(entry.declaration)).length > 0,
          ),
      )
    ) {
      continue;
    }
    const state = reducedState(group, globals);
    for (const declaration of motionDeclarations(group, state, byInteractiveBase, frames)) {
      reported.add(declaration);
    }
  }
  for (const declaration of reported) {
    stylelint.utils.report({
      ruleName,
      result,
      message: messages.motion,
      node: declaration,
      index: 0,
      endIndex: declaration.toString().length,
    });
  }
}

const ruleImpl: stylelint.RuleBase = (
  primary: unknown,
  options: unknown,
): ReturnType<stylelint.RuleBase> => {
  return (root: PostCSS.Root | PostCSS.Document, result: PostcssResult): void => {
    const ignored = exceptions(options);
    if (
      !stylelint.utils.validateOptions(
        result,
        ruleName,
        { actual: primary, possible: [true] },
        {
          actual: options,
          optional: true,
          possible: (): boolean => ignored !== undefined,
        },
      ) ||
      !ignored
    ) {
      return;
    }
    if (root.type === 'document') {
      for (const child of root.nodes) {
        if (child.type === 'root') {
          analyze(child, result, ignored);
        }
      }
    } else {
      analyze(root, result, ignored);
    }
  };
};

export const rule = stylelint.createPlugin(
  ruleName,
  Object.assign(ruleImpl, { ruleName, messages }),
) as {
  ruleName: string;
  rule: stylelint.Rule;
};
