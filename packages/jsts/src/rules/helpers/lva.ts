/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import type { Rule, Scope } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';

export function lva(liveVariablesMap: Map<string, LiveVariables>) {
  const worklist = Array.from(liveVariablesMap.values(), lva => lva.segment);
  while (worklist.length > 0) {
    const current = worklist.pop()!;
    const liveVariables = liveVariablesMap.get(current.id)!;
    const liveInHasChanged = liveVariables.propagate(liveVariablesMap);
    if (liveInHasChanged) {
      current.prevSegments.forEach(prev => worklist.push(prev));
    }
  }
}

export interface ReferenceLike {
  identifier: estree.Identifier | TSESTree.JSXIdentifier;
  from: Scope.Scope;
  resolved: Scope.Variable | null;
  writeExpr: estree.Node | null;
  init: boolean;

  isWrite(): boolean;

  isRead(): boolean;

  isWriteOnly(): boolean;

  isReadOnly(): boolean;

  isReadWrite(): boolean;
}

export class LiveVariables {
  constructor(segment: Rule.CodePathSegment) {
    this.segment = segment;
  }

  segment: Rule.CodePathSegment;

  /**
   * variables that are being read in the block
   */
  gen = new Set<Scope.Variable>();
  /**
   * variables that are being written in the block
   */
  kill = new Set<Scope.Variable>();
  /**
   * variables needed by this or a successor block and are not killed in this block
   */
  in = new Set<Scope.Variable>();
  /**
   * variables needed by successors
   */
  out: Scope.Variable[] = [];

  /**
   * collects references in order they are evaluated, set in JS maintains insertion order
   */
  references = new Set<ReferenceLike>();

  add(ref: ReferenceLike) {
    const variable = ref.resolved;
    if (variable) {
      if (ref.isRead()) {
        this.gen.add(variable);
      }
      if (ref.isWrite()) {
        this.kill.add(variable);
      }
      this.references.add(ref);
    }
  }

  propagate(liveVariablesMap: Map<string, LiveVariables>) {
    const out: Scope.Variable[] = [];
    this.segment.nextSegments.forEach(next => {
      out.push(...liveVariablesMap.get(next.id)!.in);
    });
    const diff = difference(out, this.kill);
    this.out = out;
    if (shouldUpdate(this.in, this.gen, diff)) {
      this.in = new Set([...this.gen, ...diff]);
      return true;
    } else {
      return false;
    }
  }
}

function difference<T>(a: T[], b: Set<T>): T[] {
  if (b.size === 0) {
    return a;
  }
  const diff = [];
  for (const e of a) {
    if (!b.has(e)) {
      diff.push(e);
    }
  }
  return diff;
}

function shouldUpdate(
  inSet: Set<Scope.Variable>,
  gen: Set<Scope.Variable>,
  diff: Scope.Variable[],
): boolean {
  for (const e of gen) {
    if (!inSet.has(e)) {
      return true;
    }
  }
  for (const e of diff) {
    if (!inSet.has(e)) {
      return true;
    }
  }
  return false;
}
