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
// https://sonarsource.github.io/rspec/#/rspec/S1854/javascript

import { Rule, Scope } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/utils';
import {
  generateMeta,
  isNullLiteral,
  LiveVariables,
  lva,
  ReferenceLike,
} from '../helpers/index.js';
import { meta } from './meta.js';
import CodePath = Rule.CodePath;
import Variable = Scope.Variable;
import CodePathSegment = Rule.CodePathSegment;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      removeAssignment: 'Remove this useless assignment to variable "{{variable}}".',
    },
  }),
  create(context: Rule.RuleContext) {
    const codePathStack: CodePathContext[] = [];
    const liveVariablesMap = new Map<string, LiveVariables>();
    const readVariables = new Set<Variable>();
    // map from Variable to CodePath ids where variable is used
    const variableUsages = new Map<Variable, Set<string>>();
    const referencesUsedInDestructuring = new Set<ReferenceLike>();
    const destructuringStack: DestructuringContext[] = [];
    const codePathSegments: CodePathSegment[][] = [];
    let currentCodePathSegments: CodePathSegment[] = [];

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
      JSXIdentifier: (node: unknown) => {
        checkIdentifierUsage(node as TSESTree.JSXIdentifier);
      },
      ObjectPattern: () => {
        destructuringStack.push(new DestructuringContext());
      },
      'ObjectPattern > Property > Identifier': (node: estree.Node) => {
        const destructuring = peek(destructuringStack)!;
        const { ref } = resolveReference(node as estree.Identifier);
        if (ref) {
          destructuring.references.push(ref);
        }
      },
      'ObjectPattern > :matches(RestElement, ExperimentalRestProperty)': () => {
        peek(destructuringStack).hasRest = true;
      },
      'ObjectPattern:exit': () => {
        const destructuring = destructuringStack.pop();
        if (destructuring?.hasRest) {
          destructuring.references.forEach(ref => referencesUsedInDestructuring.add(ref));
        }
      },

      'Program:exit': () => {
        lva(liveVariablesMap);
        liveVariablesMap.forEach(lva => {
          checkSegment(lva);
          reportNeverReadVariables(lva);
        });
      },

      // CodePath events
      onCodePathSegmentStart: (segment: CodePathSegment) => {
        liveVariablesMap.set(segment.id, new LiveVariables(segment));
        currentCodePathSegments.push(segment);
      },
      onCodePathStart: codePath => {
        pushContext(new CodePathContext(codePath));
        codePathSegments.push(currentCodePathSegments);
        currentCodePathSegments = [];
      },
      onCodePathSegmentEnd() {
        currentCodePathSegments.pop();
      },
      onCodePathEnd: () => {
        popContext();
        currentCodePathSegments = codePathSegments.pop() || [];
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
        !referencesUsedInDestructuring.has(ref) &&
        !variable.name.startsWith('_') &&
        !isIncrementOrDecrement(ref) &&
        !isNullAssignment(ref)
      );
    }

    function isIncrementOrDecrement(ref: ReferenceLike) {
      const parent = (ref.identifier as TSESTree.Identifier).parent;
      return parent && parent.type === 'UpdateExpression';
    }

    function isNullAssignment(ref: ReferenceLike) {
      const parent = (ref.identifier as TSESTree.Identifier).parent;
      return (
        parent &&
        parent.type === 'AssignmentExpression' &&
        isNullLiteral(parent.right as estree.Node)
      );
    }

    function isEnumConstant(node: estree.Node) {
      return (context.sourceCode.getAncestors(node) as TSESTree.Node[]).some(
        n => n.type === 'TSEnumDeclaration',
      );
    }

    function isDefaultParameter(ref: ReferenceLike) {
      if (ref.identifier.type !== 'Identifier') {
        return false;
      }
      const parent = (ref.identifier as TSESTree.Identifier).parent;
      return parent && parent.type === 'AssignmentPattern';
    }

    function isLocalVar(variable: Variable) {
      // @ts-ignore
      const scope = variable.scope;
      const node = scope.block as TSESTree.Node;
      return node.type !== 'Program' && node.type !== 'TSModuleDeclaration';
    }

    function variableUsedOutsideOfCodePath(variable: Scope.Variable) {
      return variableUsages.get(variable)!.size > 1;
    }

    function isReferenceWithBasicValue(ref: ReferenceLike) {
      return ref.init && ref.writeExpr && isBasicValue(ref.writeExpr as TSESTree.Node);
    }

    function isBasicValue(node: TSESTree.Node): boolean {
      switch (node.type) {
        case 'Literal':
          return node.value === '' || [0, 1, null, true, false].includes(node.value as any);
        case 'Identifier':
          return node.name === 'undefined';
        case 'UnaryExpression':
          return isBasicValue(node.argument);
        case 'ObjectExpression':
          return node.properties.length === 0;
        case 'ArrayExpression':
          return node.elements.length === 0;
        default:
          return false;
      }
    }

    function report(ref: ReferenceLike) {
      context.report({
        messageId: 'removeAssignment',
        data: {
          variable: ref.identifier.name,
        },
        loc: ref.identifier.loc!,
      });
    }

    function checkIdentifierUsage(node: estree.Identifier | TSESTree.JSXIdentifier) {
      const { ref, variable } =
        node.type === 'Identifier' ? resolveReference(node) : resolveJSXReference(node);
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
      const jsxReference = new JSXReference(
        node,
        context.sourceCode.getScope(node as unknown as estree.Node),
      );
      return { ref: jsxReference, variable: jsxReference.resolved };
    }

    function isJSXAttributeName(node: TSESTree.JSXIdentifier) {
      const parent = node.parent;
      return parent && parent.type === 'JSXAttribute' && parent.name === node;
    }

    function processReference(ref: ReferenceLike) {
      const assignmentStack = peek(codePathStack).assignmentStack;
      if (assignmentStack.length > 0) {
        const assignment = peek(assignmentStack);
        assignment.add(ref);
      } else {
        [...currentCodePathSegments].forEach(segment => {
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
      return resolveReferenceRecursively(node, context.sourceCode.getScope(node));
    }

    function resolveReferenceRecursively(
      node: estree.Identifier,
      scope: Scope.Scope | null,
      depth = 0,
    ): { ref: ReferenceLike | null; variable: Scope.Variable | null } {
      if (scope === null || depth > 2) {
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
        // we only need 1-level recursion, only for switch expression, which is likely a bug in eslint
        return resolveReferenceRecursively(node, scope.upper, depth + 1);
      }
    }
  },
};

class CodePathContext {
  codePath: CodePath;
  segments = new Map<string, CodePathSegment>();
  assignmentStack: AssignmentContext[] = [];

  constructor(codePath: CodePath) {
    this.codePath = codePath;
  }
}

class DestructuringContext {
  hasRest = false;
  references: ReferenceLike[] = [];
}

type AssignmentLike = TSESTree.AssignmentExpression | TSESTree.VariableDeclarator;

class AssignmentContext {
  node: AssignmentLike;

  constructor(node: AssignmentLike) {
    this.node = node;
  }

  lhs = new Set<ReferenceLike>();
  rhs = new Set<ReferenceLike>();

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
      throw new Error('failed to find assignment lhs/rhs');
    }
  }
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
