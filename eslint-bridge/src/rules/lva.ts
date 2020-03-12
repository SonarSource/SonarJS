/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import { TSESTree } from '@typescript-eslint/typescript-estree';

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
  out = new Set<Variable>();

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
    this.out.clear();
    this.segment.nextSegments.forEach(next => {
      liveVariablesMap.get(next.id)!.in.forEach(v => this.out.add(v));
    });
    const newIn = union(this.gen, difference(this.out, this.kill));
    if (!equals(this.in, newIn)) {
      this.in = newIn;
      return true;
    } else {
      return false;
    }
  }
}

function difference<T>(a: Set<T>, b: Set<T>): Set<T> {
  return new Set<T>([...a].filter(e => !b.has(e)));
}

function union<T>(a: Set<T>, b: Set<T>): Set<T> {
  return new Set<T>([...a, ...b]);
}

function equals<T>(a: Set<T>, b: Set<T>): boolean {
  return a.size === b.size && [...a].every(e => b.has(e));
}
