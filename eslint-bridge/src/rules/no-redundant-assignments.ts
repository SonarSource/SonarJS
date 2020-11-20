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
// https://jira.sonarsource.com/browse/RSPEC-

import { Rule, Scope } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { isAssignmentExpression } from 'eslint-plugin-sonarjs/lib/utils/nodes';
import CodePath = Rule.CodePath;
import Variable = Scope.Variable;
import Reference = Scope.Reference;
import CodePathSegment = Rule.CodePathSegment;
import {
  areEquivalent,
  reachingDefinitions,
  ReachingDefinitions,
  resolveAssignedValues,
} from './reachingDefinitions';

const message = (name: string) =>
  `Review this useless assignment: "${name}" already holds the assigned value along all execution paths.`;
export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const codePathStack: CodePathContext[] = [];
    const reachingDefsMap = new Map<string, ReachingDefinitions>();
    // map from Variable to CodePath ids where variable is used
    const variableUsages = new Map<Variable, Set<string>>();

    return {
      ':matches(AssignmentExpression, VariableDeclarator[init])': (node: estree.Node) => {
        pushAssignmentContext(node as AssignmentLike);
      },
      ':matches(AssignmentExpression, VariableDeclarator[init]):exit': () => {
        popAssignmentContext();
      },
      Identifier: (node: estree.Node) => {
        if (isEnumConstant()) {
          return;
        }
        checkIdentifierUsage(node as estree.Identifier);
      },
      'Program:exit': () => {
        reachingDefinitions(reachingDefsMap);
        reachingDefsMap.forEach(defs => {
          checkSegment(defs);
        });
      },

      // CodePath events
      onCodePathSegmentStart: (segment: CodePathSegment) => {
        reachingDefsMap.set(segment.id, new ReachingDefinitions(segment));
      },
      onCodePathStart: codePath => {
        pushContext(new CodePathContext(codePath));
      },
      onCodePathEnd: () => {
        popContext();
      },
    };

    function popAssignmentContext() {
      const assignment = peek(codePathStack).assignmentStack.pop()!;
      assignment.rhs.forEach(r => processReference(r));
      assignment.lhs.forEach(r => processReference(r));
    }

    function pushAssignmentContext(node: AssignmentLike) {
      peek(codePathStack).assignmentStack.push(new AssignmentContext(node));
    }

    function checkSegment(reachingDefs: ReachingDefinitions) {
      const assignedValuesMap = new Map<Variable, Set<estree.Node>>(reachingDefs.in);
      reachingDefs.references.forEach(ref => {
        const variable = ref.resolved;
        if (!variable || !ref.writeExpr || !shouldReport(ref, reachingDefs)) {
          return;
        }
        const lhsValues = assignedValuesMap.get(variable);
        if (!lhsValues) {
          const rhsValues = resolveAssignedValues(ref.writeExpr, assignedValuesMap, reachingDefs);
          checkRedundantAssignement(ref.writeExpr, ref.identifier, rhsValues, variable.name);
          assignedValuesMap.set(variable, new Set(rhsValues));
          return;
        }
        if (lhsValues.size === 1) {
          const [lhsVal] = [...lhsValues];
          const rhsValues = resolveAssignedValues(ref.writeExpr, assignedValuesMap, reachingDefs);
          checkRedundantAssignement(ref.writeExpr, lhsVal, rhsValues, variable.name);
        }
      });
    }

    function checkRedundantAssignement(
      node: estree.Node,
      lhsVal: estree.Node,
      rhsValues: Set<estree.Node>,
      name: string,
    ) {
      if (rhsValues.size !== 1) {
        return;
      }
      const [rhsVal] = [...rhsValues];
      if (areEquivalent(lhsVal, rhsVal)) {
        context.report({
          node,
          message: message(name),
        });
      }
    }

    function shouldReport(ref: Reference, reachingDefs: ReachingDefinitions) {
      const variable = ref.resolved;
      return (
        variable &&
        shouldReportReference(ref, reachingDefs) &&
        !variableUsedOutsideOfCodePath(variable)
      );
    }

    function shouldReportReference(ref: Reference, reachingDefs: ReachingDefinitions) {
      const variable = ref.resolved;

      return (
        variable &&
        isLocalVar(variable) &&
        !isDefaultParameter(ref) &&
        !variable.name.startsWith('_') &&
        !isCompoundAssignment(ref.writeExpr) &&
        !isSelfAssignement(ref, reachingDefs) &&
        !variable.defs.some(
          def => def.type === 'Parameter' || (def.type === 'Variable' && !def.node.init),
        )
      );
    }

    function isEnumConstant() {
      return (context.getAncestors() as TSESTree.Node[]).some(n => n.type === 'TSEnumDeclaration');
    }

    function variableUsedOutsideOfCodePath(variable: Scope.Variable) {
      return variableUsages.get(variable)!.size > 1;
    }

    function checkIdentifierUsage(node: estree.Identifier) {
      const { ref, variable } = resolveReference(node);
      if (ref) {
        processReference(ref);
      }
      if (variable) {
        updateVariableUsages(variable);
      }
    }

    function processReference(ref: Reference) {
      const assignmentStack = peek(codePathStack).assignmentStack;
      if (assignmentStack.length > 0) {
        const assignment = peek(assignmentStack);
        assignment.add(ref);
      } else {
        peek(codePathStack).codePath.currentSegments.forEach(segment => {
          const reachingDefs = reachingDefsForSegment(segment);
          let writeExprVariable: Variable | null = null;
          if (ref.writeExpr && ref.writeExpr.type === 'Identifier') {
            writeExprVariable = resolveReference(ref.writeExpr).variable;
          }
          reachingDefs.add(ref, writeExprVariable);
        });
      }
    }

    function reachingDefsForSegment(segment: CodePathSegment) {
      let defs;
      if (reachingDefsMap.has(segment.id)) {
        defs = reachingDefsMap.get(segment.id)!;
      } else {
        defs = new ReachingDefinitions(segment);
        reachingDefsMap.set(segment.id, defs);
      }
      return defs;
    }

    function updateVariableUsages(variable: Scope.Variable) {
      const codePathId = peek(codePathStack).codePath.id;
      if (variableUsages.has(variable)) {
        variableUsages.get(variable)!.add(codePathId);
      } else {
        variableUsages.set(
          variable,
          new Set<string>([codePathId]),
        );
      }
    }

    function pushContext(codePathContext: CodePathContext) {
      codePathStack.push(codePathContext);
    }

    function popContext() {
      codePathStack.pop();
    }

    function resolveReferenceRecursively(
      node: estree.Identifier,
      scope: Scope.Scope | null,
    ): { ref: Reference | null; variable: Scope.Variable | null } {
      if (scope === null) {
        return { ref: null, variable: null };
      }
      const ref = scope.references.find(r => r.identifier === node);
      if (ref) {
        return { ref, variable: ref.resolved };
      } else {
        // if it's not a reference, it can be just declaration without initializer
        const variable = scope.variables.find(v => v.defs.find(def => def.name === node));
        if (variable) {
          return { ref: null, variable };
        }
        // in theory we only need 1-level recursion, only for switch expression, which is likely a bug in eslint
        // generic recursion is used for safety & readability
        return resolveReferenceRecursively(node, scope.upper);
      }
    }

    function resolveReference(node: estree.Identifier) {
      return resolveReferenceRecursively(node, context.getScope());
    }
  },
};

class CodePathContext {
  reachingDefinitionsMap = new Map<string, ReachingDefinitions>();
  reachingDefinitionsStack: ReachingDefinitions[] = [];
  codePath: CodePath;
  segments = new Map<string, CodePathSegment>();
  assignmentStack: AssignmentContext[] = [];

  constructor(codePath: CodePath) {
    this.codePath = codePath;
  }
}

type AssignmentLike = estree.AssignmentExpression | estree.VariableDeclarator;

class AssignmentContext {
  node: AssignmentLike;

  constructor(node: AssignmentLike) {
    this.node = node;
  }

  lhs = new Set<Reference>();
  rhs = new Set<Reference>();

  isRhs(node: TSESTree.Node) {
    return isAssignmentExpression(this.node) ? this.node.right === node : this.node.init === node;
  }

  isLhs(node: TSESTree.Node) {
    return isAssignmentExpression(this.node) ? this.node.left === node : this.node.id === node;
  }

  add(ref: Reference) {
    let parent = ref.identifier as TSESTree.Node | undefined;
    while (parent) {
      if (this.isLhs(parent)) {
        this.lhs.add(ref);
        break;
      }
      if (this.isRhs(parent)) {
        this.rhs.add(ref);
        break;
      }
      parent = parent.parent;
    }
    if (parent === null) {
      throw new Error('failed to find assignment lhs/rhs');
    }
  }
}

function peek<T>(arr: Array<T>) {
  return arr[arr.length - 1];
}

function isSelfAssignement(ref: Reference, reachingDefs: ReachingDefinitions) {
  const lhs = ref.resolved;
  if (ref.writeExpr?.type === 'Identifier') {
    const rhs = reachingDefs.identifierVariablesMap.get(ref.writeExpr);
    return lhs === rhs;
  }
  return false;
}

function isCompoundAssignment(writeExpr: estree.Node | null) {
  if (writeExpr && writeExpr.hasOwnProperty('parent')) {
    const node = (writeExpr as TSESTree.Node).parent;
    return node && node.type === 'AssignmentExpression' && node.operator !== '=';
  }
  return false;
}

function isDefaultParameter(ref: Reference) {
  if (ref.identifier.type !== 'Identifier') {
    return false;
  }
  const parent = (ref.identifier as TSESTree.Identifier).parent;
  return parent && parent.type === 'AssignmentPattern';
}

function hasUpperFunctionScope(scope: Scope.Scope | null): boolean {
  return (
    !!scope &&
    (scope.type === 'function' ||
      scope.type === 'function-expression-name' ||
      hasUpperFunctionScope(scope.upper))
  );
}

function isLocalVar(variable: Scope.Variable) {
  // @ts-ignore scope is not exposed in the API
  const scope = variable.scope;
  return hasUpperFunctionScope(scope);
}
