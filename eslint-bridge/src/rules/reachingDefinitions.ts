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
import * as estree from 'estree';
import Variable = Scope.Variable;
import CodePathSegment = Rule.CodePathSegment;
import Reference = Scope.Reference;

export type VariableValue = Set<estree.Node>;

export function reachingDefinitions(reachingDefinitionsMap: Map<string, ReachingDefinitions>) {
  const worklist = Array.from(reachingDefinitionsMap.values(), defs => defs.segment);

  while (worklist.length > 0) {
    const current = worklist.pop()!;
    const reachingDefs = reachingDefinitionsMap.get(current.id)!;
    const outHasChanged = reachingDefs.propagate(reachingDefinitionsMap);
    if (outHasChanged) {
      current.nextSegments.forEach(next => worklist.push(next));
    }
  }
}

export class ReachingDefinitions {
  constructor(segment: Rule.CodePathSegment) {
    this.segment = segment;
  }

  segment: CodePathSegment;

  in = new Map<Variable, VariableValue>();

  out = new Map<Variable, VariableValue>();

  /**
   * collects references in order they are evaluated, set in JS maintains insertion order
   */
  references = new Set<Reference>();

  add(ref: Reference) {
    const variable = ref.resolved;
    if (variable) {
      this.references.add(ref);
    }
  }

  propagate(reachingDefinitionsMap: Map<string, ReachingDefinitions>) {
    this.in.clear();
    this.segment.prevSegments.forEach(prev => {
      this.in = this.join(this.in, reachingDefinitionsMap.get(prev.id)!.out);
    });
    const newOut = new Map<Variable, VariableValue>(this.in);
    this.references.forEach(ref => this.updateProgramState(ref, newOut));
    if (!equals(this.out, newOut)) {
      this.out = newOut;
      return true;
    } else {
      return false;
    }
  }

  updateProgramState(ref: Reference, programState: Map<Variable, VariableValue>) {
    const variable = ref.resolved;
    if (!variable || !ref.isWrite()) {
      return;
    }
    if (!ref.writeExpr) {
      // @ts-ignore parent is not exposed in the API
      programState.set(variable, new Set([ref.identifier.parent]));
      return;
    }
    const rhsValues = resolveAssignedValues(ref.writeExpr, programState, ref.from);
    programState.set(variable, rhsValues);
  }

  join(ps1: Map<Variable, VariableValue>, ps2: Map<Variable, VariableValue>) {
    const result = new Map<Variable, VariableValue>();
    for (const key of [...ps1.keys(), ...ps2.keys()]) {
      const allValues: VariableValue = new Set();
      const values1 = [...(ps1.get(key) || [])];
      for (const val of values1) {
        if (!setContains(allValues, val)) {
          allValues.add(val);
        }
      }
      const values2 = [...(ps2.get(key) || [])];
      for (const val of values2) {
        if (!setContains(allValues, val)) {
          allValues.add(val);
        }
      }
      result.set(key, allValues);
    }
    return result;
  }
}

function setContains(set: VariableValue, value: estree.Node) {
  for (const val of set) {
    if (areEquivalent(val, value)) {
      return true;
    }
  }
  return false;
}

export function areEquivalent(node1: estree.Node, node2: estree.Node) {
  if (node1.type !== node2.type) {
    return false;
  }
  switch (node1.type) {
    case 'Identifier':
      return node1.name === (node2 as estree.Identifier).name;
    case 'Literal':
      return node1.raw === (node2 as estree.Literal).raw;
    default:
      return false;
  }
}

export function resolveAssignedValues(
  writeExpr: estree.Node,
  assignedValuesMap: Map<Variable, VariableValue>,
  scope: Scope.Scope,
) {
  let assignedValues = new Set([writeExpr]);
  if (writeExpr.type === 'Identifier') {
    const resolvedVar = getVariableFromIdentifier(writeExpr, scope);
    if (resolvedVar) {
      const resolvedAssignedValues = assignedValuesMap.get(resolvedVar);
      if (resolvedAssignedValues) {
        assignedValues = resolvedAssignedValues;
      }
    }
  }
  return assignedValues;
}

function equals(ps1: Map<Variable, VariableValue>, ps2: Map<Variable, VariableValue>) {
  if (ps1.size !== ps2.size) {
    return false;
  }
  for (const [variable, expressions1] of ps1) {
    const expressions2 = ps2.get(variable);
    if (!expressions2 || !setEquals(expressions2, expressions1)) {
      return false;
    }
  }
  return true;
}

function setEquals<T>(a: Set<T>, b: Set<T>): boolean {
  return a.size === b.size && [...a].every(e => b.has(e));
}

export function getVariableFromIdentifier(identifier: estree.Identifier, scope: Scope.Scope) {
  let variable = scope.variables.find(value => value.name === identifier.name);
  if (!variable && scope.upper) {
    variable = scope.upper.variables.find(value => value.name === identifier.name);
  }
  return variable;
}
