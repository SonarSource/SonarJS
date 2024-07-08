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
// https://sonarsource.github.io/rspec/#/rspec/S4165/javascript

import { Rule, Scope } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/utils';
import CodePath = Rule.CodePath;
import Variable = Scope.Variable;
import Reference = Scope.Reference;
import CodePathSegment = Rule.CodePathSegment;
import {
  getVariableFromIdentifier,
  reachingDefinitions,
  ReachingDefinitions,
  resolveAssignedValues,
  Values,
} from '../helpers';
import { generateMeta } from '../helpers/generate-meta';
import rspecMeta from './meta.json';

export const rule: Rule.RuleModule = {
  meta: generateMeta(rspecMeta as Rule.RuleMetaData, {
    messages: {
      reviewAssignment:
        'Review this redundant assignment: "{{symbol}}" already holds the assigned value along all execution paths.',
    },
  }),
  create(context: Rule.RuleContext) {
    const codePathStack: CodePathContext[] = [];
    const reachingDefsMap = new Map<string, ReachingDefinitions>();
    // map from Variable to CodePath ids where variable is used
    const variableUsages = new Map<Variable, Set<string>>();
    const codePathSegments: Rule.CodePathSegment[][] = [];
    let currentCodePathSegments: Rule.CodePathSegment[] = [];

    return {
      ':matches(AssignmentExpression, VariableDeclarator[init])': (node: estree.Node) => {
        pushAssignmentContext(node as AssignmentLike);
      },
      ':matches(AssignmentExpression, VariableDeclarator[init]):exit': () => {
        popAssignmentContext();
      },
      Identifier: (node: estree.Node) => {
        if (isEnumConstant(node)) {
          return;
        }
        checkIdentifierUsage(node as estree.Identifier);
      },
      'Program:exit': () => {
        reachingDefinitions(reachingDefsMap);
        reachingDefsMap.forEach(defs => {
          checkSegment(defs);
        });
        reachingDefsMap.clear();
        variableUsages.clear();
        while (codePathStack.length > 0) {
          codePathStack.pop();
        }
      },

      // CodePath events
      onCodePathSegmentStart: (segment: CodePathSegment) => {
        reachingDefsMap.set(segment.id, new ReachingDefinitions(segment));
        currentCodePathSegments.push(segment);
      },
      onCodePathStart: codePath => {
        pushContext(new CodePathContext(codePath));
        codePathSegments.push(currentCodePathSegments);
        currentCodePathSegments = [];
      },
      onCodePathEnd: () => {
        popContext();
        currentCodePathSegments = codePathSegments.pop() || [];
      },
      onCodePathSegmentEnd() {
        currentCodePathSegments.pop();
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
      const assignedValuesMap = new Map<Variable, Values>(reachingDefs.in);
      reachingDefs.references.forEach(ref => {
        const variable = ref.resolved;
        if (!variable || !ref.isWrite() || !shouldReport(ref)) {
          return;
        }
        const lhsValues = assignedValuesMap.get(variable);
        const rhsValues = resolveAssignedValues(
          variable,
          ref.writeExpr,
          assignedValuesMap,
          ref.from,
        );
        if (lhsValues?.type === 'AssignedValues' && lhsValues?.size === 1) {
          const [lhsVal] = [...lhsValues];
          checkRedundantAssignement(ref, ref.writeExpr, lhsVal, rhsValues, variable.name);
        }
        assignedValuesMap.set(variable, rhsValues);
      });
    }

    function checkRedundantAssignement(
      { resolved: variable }: Scope.Reference,
      node: estree.Node | null,
      lhsVal: string | Variable,
      rhsValues: Values,
      name: string,
    ) {
      if (rhsValues.type === 'UnknownValue' || rhsValues.size !== 1) {
        return;
      }
      const [rhsVal] = [...rhsValues];
      if (!isWrittenOnlyOnce(variable!) && lhsVal === rhsVal) {
        context.report({
          node: node!,
          messageId: 'reviewAssignment',
          data: {
            symbol: name,
          },
        });
      }
    }

    // to avoid raising on code like:
    // while (cond) {  let x = 42; }
    function isWrittenOnlyOnce(variable: Scope.Variable) {
      return variable.references.filter(ref => ref.isWrite()).length === 1;
    }

    function shouldReport(ref: Reference) {
      const variable = ref.resolved;
      return variable && shouldReportReference(ref) && !variableUsedOutsideOfCodePath(variable);
    }

    function shouldReportReference(ref: Reference) {
      const variable = ref.resolved;

      return (
        variable &&
        !isDefaultParameter(ref) &&
        !variable.name.startsWith('_') &&
        !isCompoundAssignment(ref.writeExpr) &&
        !isSelfAssignement(ref) &&
        !variable.defs.some(
          def => def.type === 'Parameter' || (def.type === 'Variable' && !def.node.init),
        )
      );
    }

    function isEnumConstant(node: estree.Node) {
      return (context.sourceCode.getAncestors(node) as TSESTree.Node[]).some(
        n => n.type === 'TSEnumDeclaration',
      );
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
        currentCodePathSegments.forEach(segment => {
          const reachingDefs = reachingDefsForSegment(segment);
          reachingDefs.add(ref);
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
        variableUsages.set(variable, new Set<string>([codePathId]));
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
      return resolveReferenceRecursively(node, context.sourceCode.getScope(node));
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

type AssignmentLike = TSESTree.AssignmentExpression | TSESTree.VariableDeclarator;

class AssignmentContext {
  node: AssignmentLike;

  constructor(node: AssignmentLike) {
    this.node = node;
  }

  lhs = new Set<Reference>();
  rhs = new Set<Reference>();

  isRhs(node: TSESTree.Node) {
    return this.node.type === 'AssignmentExpression'
      ? this.node.right === node
      : this.node.init === node;
  }

  isLhs(node: TSESTree.Node) {
    return this.node.type === 'AssignmentExpression'
      ? this.node.left === node
      : this.node.id === node;
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

function isSelfAssignement(ref: Reference) {
  const lhs = ref.resolved;
  if (ref.writeExpr?.type === 'Identifier') {
    const rhs = getVariableFromIdentifier(ref.writeExpr, ref.from);
    return lhs === rhs;
  }
  return false;
}

function isCompoundAssignment(writeExpr: estree.Node | null) {
  if (writeExpr?.hasOwnProperty('parent')) {
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
