/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { Rule, Scope } from 'eslint';
import Variable = Scope.Variable;
import CodePathSegment = Rule.CodePathSegment;
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/utils';

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

  segment: CodePathSegment;

  /**
   * variables that are being read in the block
   */
  gen = new Set<Variable>();
  /**
   * variables that are being written in the block
   */
  kill = new Set<Variable>();
  /**
   * variables needed by this or a successor block and are not killed in this block
   */
  in = new Set<Variable>();
  /**
   * variables needed by successors
   */
  out: Variable[] = [];

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
    const out: Variable[] = [];
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

function shouldUpdate(inSet: Set<Variable>, gen: Set<Variable>, diff: Variable[]): boolean {
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
