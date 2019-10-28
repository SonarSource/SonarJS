/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-1854

import { Rule, Scope } from "eslint";
import * as estree from "estree";
import { TSESTree, AST_NODE_TYPES } from "@typescript-eslint/experimental-utils";
import {
  isLiteral,
  isObjectExpression,
  isIdentifier,
  isAssignmentExpression,
} from "eslint-plugin-sonarjs/lib/utils/nodes";
import { isUnaryExpression, isArrayExpression } from "./utils";
import CodePath = Rule.CodePath;
import Variable = Scope.Variable;
import CodePathSegment = Rule.CodePathSegment;

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const codePathStack: CodePathContext[] = [];
    let liveVariablesMap = new Map<string, LiveVariables>();
    const readVariables = new Set<Variable>();
    // map from Variable to CodePath ids where variable is used
    const variableUsages = new Map<Variable, Set<string>>();

    return {
      "VariableDeclarator[init]": (node: estree.Node) => {
        pushAssignmentContext(node as AssignmentLike);
      },
      "VariableDeclarator[init]:exit": (_node: estree.Node) => {
        popAssignmentContext();
      },
      AssignmentExpression: (node: estree.Node) => {
        pushAssignmentContext(node as AssignmentLike);
      },
      "AssignmentExpression:exit": (_node: estree.Node) => {
        popAssignmentContext();
      },
      Identifier: (node: estree.Node) => {
        if (isEnumConstant()) {
          return;
        }
        checkIdentifierUsage(node as estree.Identifier);
      },
      JSXIdentifier: (node: any) => {
        checkIdentifierUsage(node as TSESTree.JSXIdentifier);
      },

      "Program:exit": () => {
        lva(liveVariablesMap);
        liveVariablesMap.forEach(lva => {
          checkSegment(lva);
          reportNeverReadVariables(lva);
        });
      },

      // CodePath events
      onCodePathSegmentStart: (segment: CodePathSegment, _node: estree.Node) => {
        liveVariablesMap.set(segment.id, new LiveVariables(segment));
      },
      onCodePathStart: (codePath, _node) => {
        pushContext(new CodePathContext(codePath));
      },
      onCodePathEnd: (_codePath, _node) => {
        popContext();
      },
    };

    function pushAssignmentContext(node: AssignmentLike) {
      peek(codePathStack).assignmentStack.push(new AssignmentContext(node));
    }

    function popAssignmentContext() {
      const assignment = peek(codePathStack).assignmentStack.pop()!;
      assignment.rhs.forEach(r => processReference(r));
      assignment.lhs.forEach(r => processReference(r));
    }

    function lva(liveVariablesMap: Map<string, LiveVariables>) {
      const worklist = Array.from(liveVariablesMap.values(), lva => lva.segment);
      while (worklist.length > 0) {
        const current = worklist.pop()!;
        const liveVariables = liveVariablesMap.get(current.id)!;
        const liveInHasChanged = liveVariables.propagate(current, liveVariablesMap);
        if (liveInHasChanged) {
          current.prevSegments.forEach(prev => worklist.push(prev));
        }
      }
    }

    function checkSegment(liveVariables: LiveVariables) {
      const willBeRead = new Set<Variable>(liveVariables.out);
      const references = [...liveVariables.references].reverse();
      references.forEach(ref => {
        const variable = ref.resolved;
        if (!variable) {
          return;
        }
        if (ref.isWrite()) {
          if (!willBeRead.has(variable) && shouldReport(ref)) {
            report(ref);
          }
          willBeRead.delete(variable);
        }
        if (ref.isRead()) {
          willBeRead.add(variable);
        }
      });
    }

    function reportNeverReadVariables(lva: LiveVariables) {
      lva.references.forEach(ref => {
        if (shouldReportReference(ref) && !readVariables.has(ref.resolved!)) {
          report(ref);
        }
      });
    }

    function shouldReport(ref: ReferenceLike) {
      const variable = ref.resolved;
      return (
        variable &&
        shouldReportReference(ref) &&
        !variableUsedOutsideOfCodePath(variable) &&
        readVariables.has(variable)
      );
    }

    function shouldReportReference(ref: ReferenceLike) {
      const variable = ref.resolved;
      return (
        variable &&
        isLocalVar(variable) &&
        !isReferenceWithBasicValue(ref) &&
        !isDefaultParameter(ref) &&
        !variable.name.startsWith("_")
      );
    }

    function isEnumConstant() {
      return (context.getAncestors() as TSESTree.Node[]).some(n => n.type === "TSEnumDeclaration");
    }

    function isDefaultParameter(ref: ReferenceLike) {
      if (ref.identifier.type !== "Identifier") {
        return false;
      }
      const parent = (ref.identifier as TSESTree.Identifier).parent;
      return parent && parent.type === AST_NODE_TYPES.AssignmentPattern;
    }

    function isLocalVar(variable: Scope.Variable) {
      // @ts-ignore scope is not exposed in the API
      const scope = variable.scope;
      return hasUpperFunctionScope(scope);
    }

    function hasUpperFunctionScope(scope: Scope.Scope | null): boolean {
      return (
        !!scope &&
        (scope.type === "function" ||
          scope.type === "function-expression-name" ||
          hasUpperFunctionScope(scope.upper))
      );
    }

    function variableUsedOutsideOfCodePath(variable: Scope.Variable) {
      return variableUsages.get(variable)!.size > 1;
    }

    function isReferenceWithBasicValue(ref: ReferenceLike) {
      return ref.init && ref.writeExpr && isBasicValue(ref.writeExpr);
    }

    function isBasicValue(node: estree.Node): boolean {
      if (isLiteral(node)) {
        return node.value === "" || [0, 1, null, true, false].includes(node.value as any);
      }
      if (isIdentifier(node)) {
        return node.name === "undefined";
      }
      if (isUnaryExpression(node)) {
        return isBasicValue(node.argument);
      }
      if (isObjectExpression(node)) {
        return node.properties.length === 0;
      }
      if (isArrayExpression(node)) {
        return node.elements.length === 0;
      }
      return false;
    }

    function report(ref: ReferenceLike) {
      context.report({
        message: `Remove this useless assignment to variable "${ref.identifier.name}".`,
        loc: ref.identifier.loc!,
      });
    }

    function checkIdentifierUsage(node: estree.Identifier | TSESTree.JSXIdentifier) {
      const { ref, variable } =
        node.type === "Identifier" ? resolveReference(node) : resolveJSXReference(node);
      if (ref) {
        processReference(ref);
        if (variable) {
          updateReadVariables(ref);
        }
      }
      if (variable) {
        updateVariableUsages(variable);
      }
    }

    function resolveJSXReference(node: TSESTree.JSXIdentifier) {
      if (isJSXAttributeName(node)) {
        return {};
      }
      const jsxReference = new JSXReference(node, context.getScope());
      return { ref: jsxReference, variable: jsxReference.resolved };
    }

    function isJSXAttributeName(node: TSESTree.JSXIdentifier) {
      const parent = node.parent;
      return parent && parent.type === "JSXAttribute" && parent.name === node;
    }

    function processReference(ref: ReferenceLike) {
      const assignmentStack = peek(codePathStack).assignmentStack;
      if (assignmentStack.length > 0) {
        const assignment = peek(assignmentStack);
        assignment.add(ref);
      } else {
        peek(codePathStack).codePath.currentSegments.forEach(segment => {
          lvaForSegment(segment).add(ref);
        });
      }
    }

    function lvaForSegment(segment: CodePathSegment) {
      let lva;
      if (liveVariablesMap.has(segment.id)) {
        lva = liveVariablesMap.get(segment.id)!;
      } else {
        lva = new LiveVariables(segment);
        liveVariablesMap.set(segment.id, lva);
      }
      return lva;
    }

    function updateReadVariables(reference: ReferenceLike) {
      const variable = reference.resolved!;
      if (reference.isRead()) {
        readVariables.add(variable);
      }
    }

    function updateVariableUsages(variable: Scope.Variable) {
      const codePathId = peek(codePathStack).codePath.id;
      if (variableUsages.has(variable)) {
        variableUsages.get(variable)!.add(codePathId);
      } else {
        variableUsages.set(variable, new Set<string>([codePathId]));
      }
    }

    function popContext() {
      codePathStack.pop();
    }

    function pushContext(codePathContext: CodePathContext) {
      codePathStack.push(codePathContext);
    }

    function resolveReference(node: estree.Identifier) {
      return resolveReferenceRecursively(node, context.getScope());
    }

    function resolveReferenceRecursively(
      node: estree.Identifier,
      scope: Scope.Scope | null,
    ): { ref: ReferenceLike | null; variable: Scope.Variable | null } {
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
        return resolveReferenceRecursively(node, scope.upper);
      }
    }
  },
};

class CodePathContext {
  liveVariablesMap = new Map<string, LiveVariables>();
  liveVariablesStack: LiveVariables[] = [];
  codePath: CodePath;
  segments = new Map<string, CodePathSegment>();
  assignmentStack: AssignmentContext[] = [];

  constructor(codePath: CodePath) {
    this.codePath = codePath;
  }
}

class LiveVariables {
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

  propagate(segment: CodePathSegment, liveVariablesMap: Map<string, LiveVariables>) {
    this.out.clear();
    segment.nextSegments.forEach(next => {
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

type AssignmentLike = estree.AssignmentExpression | estree.VariableDeclarator;

class AssignmentContext {
  node: AssignmentLike;

  constructor(node: AssignmentLike) {
    this.node = node;
  }

  lhs = new Set<ReferenceLike>();
  rhs = new Set<ReferenceLike>();

  isRhs(node: TSESTree.Node) {
    return isAssignmentExpression(this.node) ? this.node.right === node : this.node.init === node;
  }

  isLhs(node: TSESTree.Node) {
    return isAssignmentExpression(this.node) ? this.node.left === node : this.node.id === node;
  }

  add(ref: ReferenceLike) {
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
      throw new Error("failed to find assignment lhs/rhs");
    }
  }
}

interface ReferenceLike {
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

class JSXReference implements ReferenceLike {
  from: Scope.Scope;
  identifier: TSESTree.JSXIdentifier;
  init = false;
  resolved: Scope.Variable | null;
  writeExpr: estree.Node | null = null;

  constructor(node: TSESTree.JSXIdentifier, scope: Scope.Scope) {
    this.from = scope;
    this.identifier = node;
    this.resolved = findJSXVariableInScope(node, scope);
  }

  isRead(): boolean {
    return true;
  }

  isReadOnly(): boolean {
    return true;
  }

  isReadWrite(): boolean {
    return false;
  }

  isWrite(): boolean {
    return false;
  }

  isWriteOnly(): boolean {
    return false;
  }
}

function findJSXVariableInScope(
  node: TSESTree.JSXIdentifier,
  scope: Scope.Scope | null,
): Scope.Variable | null {
  return (
    scope &&
    (scope.variables.find(v => v.name === node.name) || findJSXVariableInScope(node, scope.upper))
  );
}

function peek<T>(arr: Array<T>) {
  return arr[arr.length - 1];
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
