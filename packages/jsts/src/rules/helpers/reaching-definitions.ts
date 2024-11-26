/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import estree from 'estree';

type LiteralValue = string;

class AssignedValues extends Set<LiteralValue> {
  type = 'AssignedValues' as const;
}

const assignedValues = (val: LiteralValue) => new AssignedValues([val]);
interface UnknownValue {
  type: 'UnknownValue';
}
export const unknownValue: UnknownValue = {
  type: 'UnknownValue',
};

export type Values = AssignedValues | UnknownValue;

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

  segment: Rule.CodePathSegment;

  in = new Map<Scope.Variable, Values>();

  out = new Map<Scope.Variable, Values>();

  /**
   * collects references in order they are evaluated, set in JS maintains insertion order
   */
  references = new Set<Scope.Reference>();

  add(ref: Scope.Reference) {
    const variable = ref.resolved;
    if (variable) {
      this.references.add(ref);
    }
  }

  propagate(reachingDefinitionsMap: Map<string, ReachingDefinitions>) {
    this.in.clear();
    this.segment.prevSegments.forEach(prev => {
      this.join(reachingDefinitionsMap.get(prev.id)!.out);
    });
    const newOut = new Map<Scope.Variable, Values>(this.in);
    this.references.forEach(ref => this.updateProgramState(ref, newOut));
    if (!equals(this.out, newOut)) {
      this.out = newOut;
      return true;
    } else {
      return false;
    }
  }

  updateProgramState(ref: Scope.Reference, programState: Map<Scope.Variable, Values>) {
    const variable = ref.resolved;
    if (!variable || !ref.isWrite()) {
      return;
    }
    if (!ref.writeExpr) {
      programState.set(variable, unknownValue);
      return;
    }
    const rhsValues = resolveAssignedValues(variable, ref.writeExpr, programState, ref.from);
    programState.set(variable, rhsValues);
  }

  join(previousOut: Map<Scope.Variable, Values>) {
    for (const [key, values] of previousOut.entries()) {
      const inValues = this.in.get(key) ?? new AssignedValues();
      if (inValues.type === 'AssignedValues' && values.type === 'AssignedValues') {
        values.forEach(val => inValues.add(val));
        this.in.set(key, inValues);
      } else {
        this.in.set(key, unknownValue);
      }
    }
  }
}

export function resolveAssignedValues(
  lhsVariable: Scope.Variable,
  writeExpr: estree.Node | null,
  assignedValuesMap: Map<Scope.Variable, Values>,
  scope: Scope.Scope,
): Values {
  if (!writeExpr) {
    return unknownValue;
  }
  switch (writeExpr.type) {
    case 'Literal':
      return writeExpr.raw ? assignedValues(writeExpr.raw) : unknownValue;
    case 'Identifier': {
      const resolvedVar = getVariableFromIdentifier(writeExpr, scope);
      if (resolvedVar && resolvedVar !== lhsVariable) {
        const resolvedAssignedValues = assignedValuesMap.get(resolvedVar);
        return resolvedAssignedValues ?? unknownValue;
      }
      return unknownValue;
    }
    default:
      return unknownValue;
  }
}

function equals(ps1: Map<Scope.Variable, Values>, ps2: Map<Scope.Variable, Values>) {
  if (ps1.size !== ps2.size) {
    return false;
  }
  for (const [variable, values1] of ps1) {
    const values2 = ps2.get(variable);
    if (!values2 || !valuesEquals(values2, values1)) {
      return false;
    }
  }
  return true;
}

function valuesEquals(a: Values, b: Values) {
  if (a.type === 'AssignedValues' && b.type === 'AssignedValues') {
    return setEquals(a, b);
  }
  return a === b;
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
