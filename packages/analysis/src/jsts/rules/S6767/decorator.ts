/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
// https://sonarsource.github.io/rspec/#/rspec/S6767/javascript

import type { Rule, Scope, SourceCode } from 'eslint';
import type estree from 'estree';
import type { JSXSpreadAttribute } from 'estree-jsx';
import { childrenOf, getNodeParent } from '../helpers/ancestor.js';
import { isFunctionNode, isIdentifier } from '../helpers/ast.js';
import { interceptReportForReact } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { findComponentNode } from '../helpers/react.js';
import * as meta from './generated-meta.js';

/** Composable pattern checkers — extend via Array.some() for future FP patterns. */
const propsArgPatterns: Array<(arg: estree.Node) => boolean> = [
  arg => isIdentifier(arg, 'props'),
  arg =>
    arg.type === 'MemberExpression' &&
    arg.object.type === 'ThisExpression' &&
    isIdentifier(arg.property, 'props'),
];

/** Composable callee checkers for forwardRef call detection. */
const forwardRefCalleePatterns: Array<(callee: estree.Expression | estree.Super) => boolean> = [
  callee => isIdentifier(callee, 'forwardRef'),
  callee =>
    callee.type === 'MemberExpression' &&
    isIdentifier(callee.object, 'React') &&
    isIdentifier(callee.property, 'forwardRef'),
];

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    { ...rule, meta: generateMeta(meta, rule.meta) },
    (context, descriptor) => {
      const { node } = descriptor as { node: estree.Node };
      const componentNode = findComponentNode(node, context);
      if (componentNode && hasPropsCall(componentNode, context.sourceCode.visitorKeys)) {
        return;
      }
      // Suppress FP only when the specific reported prop is referenced inside a forwardRef callback.
      const { data } = descriptor as { data?: Record<string, string> };
      const propName = data?.name;
      if (
        propName &&
        componentNode &&
        hasPropMemberReference(context.sourceCode, componentNode, propName)
      ) {
        return;
      }
      // Suppress FP when the component is wrapped in an HOC and exported from the file.
      if (componentNode) {
        const componentName = getComponentName(componentNode);
        if (componentName && isExportedViaHoc(componentName, context.sourceCode.ast.body)) {
          return;
        }
      }
      context.report(descriptor);
    },
  );
}

/**
 * Returns true only when `propName` is referenced through the component's actual
 * first parameter binding and the matching member access sits inside a forwardRef callback.
 */
function hasPropMemberReference(
  sourceCode: SourceCode,
  componentNode: estree.Node,
  propName: string,
): boolean {
  if (!isFunctionNode(componentNode)) {
    return false;
  }

  const propsParam = componentNode.params[0];
  if (!isIdentifier(propsParam)) {
    return false;
  }

  const variable = sourceCode.getScope(componentNode).set.get(propsParam.name);
  if (!variable) {
    return false;
  }

  return variable.references.some(reference =>
    isPropReferenceInForwardRefCallback(reference, propName),
  );
}

function isPropReferenceInForwardRefCallback(
  reference: Scope.Reference,
  propName: string,
): boolean {
  const memberExpression = getNodeParent(reference.identifier);
  if (
    memberExpression?.type !== 'MemberExpression' ||
    memberExpression.object !== reference.identifier ||
    memberExpression.computed ||
    !isIdentifier(memberExpression.property, propName)
  ) {
    return false;
  }

  // Walk up ancestors. Track `prev` so that when we find a forwardRef CallExpression
  // we can confirm the reference sits inside its first argument (the render callback),
  // not in the callee position or a later argument.
  let prev: estree.Node = memberExpression;
  let current: estree.Node | undefined = getNodeParent(memberExpression);
  while (current) {
    if (current.type === 'CallExpression') {
      const call = current;
      if (
        forwardRefCalleePatterns.some(pattern => pattern(call.callee)) &&
        call.arguments[0] === prev
      ) {
        return true;
      }
    }
    prev = current;
    current = getNodeParent(current);
  }
  return false;
}

function hasPropsCall(root: estree.Node, keys: SourceCode.VisitorKeys): boolean {
  if (!root) {
    return false;
  }

  // Check if this is a CallExpression with props as argument
  if (root.type === 'CallExpression') {
    const call = root as estree.CallExpression;
    if (
      call.callee.type !== 'Super' &&
      !isPropTypesCheckCall(call) &&
      call.arguments.some(a => propsArgPatterns.some(p => p(a as estree.Node)))
    ) {
      return true;
    }
  }

  // Check if this is a SpreadElement with props (for {...props} in JSX)
  if (root.type === 'SpreadElement' && propsArgPatterns.some(p => p(root.argument))) {
    return true;
  }

  // Check if this is a JSXSpreadAttribute with props (for {...props} or {...this.props} in JSX elements)
  if (
    root.type === 'JSXSpreadAttribute' &&
    propsArgPatterns.some(p => p((root as unknown as JSXSpreadAttribute).argument))
  ) {
    return true;
  }

  // Check if this is a computed MemberExpression with props (for props[key] or this.props[key])
  if (
    root.type === 'MemberExpression' &&
    root.computed &&
    propsArgPatterns.some(p => p(root.object))
  ) {
    return true;
  }

  // Recursively check all children
  return childrenOf(root, keys).some(child => hasPropsCall(child, keys));
}

function isPropTypesCheckCall(call: estree.CallExpression): boolean {
  return (
    call.callee.type === 'MemberExpression' &&
    isIdentifier(call.callee.object, 'PropTypes') &&
    isIdentifier(call.callee.property, 'checkPropTypes')
  );
}

/** Extract the component identifier name from the component node. */
function getComponentName(node: estree.Node): string | null {
  if (node.type === 'ClassDeclaration' || node.type === 'FunctionDeclaration') {
    return (node as estree.ClassDeclaration | estree.FunctionDeclaration).id?.name ?? null;
  }
  if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
    const parent = getNodeParent(node);
    if (parent?.type === 'VariableDeclarator') {
      const { id } = parent as estree.VariableDeclarator;
      if (id.type === 'Identifier') {
        return id.name;
      }
    }
  }
  return null;
}

/**
 * Recursively extracts the wrapped component name from an HOC call expression.
 * Handles curried HOCs like connect(mapState)(MyComponent) and single HOCs like withRouter(MyComponent).
 */
function getHocWrappedComponentName(call: estree.CallExpression): string | null {
  const arg = call.arguments[0] as estree.Node | undefined;
  if (!arg || arg.type === 'SpreadElement') {
    return null;
  }
  if (arg.type === 'Identifier' && /^[A-Z]/.test((arg as estree.Identifier).name)) {
    return (arg as estree.Identifier).name;
  }
  if (arg.type === 'CallExpression') {
    return getHocWrappedComponentName(arg as estree.CallExpression);
  }
  return null;
}

type ProgramStatement = estree.Statement | estree.ModuleDeclaration;

/** Composable HOC export pattern checkers — extend via Array.some() for future FP patterns. */
const hocExportPatterns: Array<(stmt: ProgramStatement, name: string) => boolean> = [
  // Pattern 1: export default HOC(Comp) or export default HOC(config)(Comp)
  (stmt, name) => {
    if (stmt.type !== 'ExportDefaultDeclaration') {
      return false;
    }
    const { declaration } = stmt as estree.ExportDefaultDeclaration;
    return (
      declaration.type === 'CallExpression' &&
      getHocWrappedComponentName(declaration as estree.CallExpression) === name
    );
  },
  // Pattern 2: export const X = HOC(Comp)
  (stmt, name) => {
    if (stmt.type !== 'ExportNamedDeclaration') {
      return false;
    }
    const { declaration } = stmt as estree.ExportNamedDeclaration;
    if (declaration?.type !== 'VariableDeclaration') {
      return false;
    }
    return declaration.declarations.some(
      d =>
        d.init?.type === 'CallExpression' &&
        getHocWrappedComponentName(d.init as estree.CallExpression) === name,
    );
  },
  // Pattern 3: module.exports = HOC(Comp)
  (stmt, name) => {
    if (stmt.type !== 'ExpressionStatement') {
      return false;
    }
    const { expression } = stmt as estree.ExpressionStatement;
    if (expression.type !== 'AssignmentExpression') {
      return false;
    }
    const { left, right } = expression;
    if (
      left.type !== 'MemberExpression' ||
      !isIdentifier(left.object, 'module') ||
      !isIdentifier(left.property, 'exports')
    ) {
      return false;
    }
    return (
      right.type === 'CallExpression' &&
      getHocWrappedComponentName(right as estree.CallExpression) === name
    );
  },
];

/**
 * Returns true if `componentName` is wrapped in an HOC and exported anywhere in the file.
 * Phase 1 checks inline export forms; phase 2 checks the two-statement form.
 */
function isExportedViaHoc(componentName: string, body: ProgramStatement[]): boolean {
  // Phase 1: inline export patterns (export default, export const, module.exports)
  if (body.some(stmt => hocExportPatterns.some(pattern => pattern(stmt, componentName)))) {
    return true;
  }

  // Phase 2: two-statement form — const X = HOC(Comp); export { X } or export default X
  const hocWrappedNames = new Set<string>();
  for (const stmt of body) {
    if (stmt.type === 'VariableDeclaration') {
      for (const declarator of (stmt as estree.VariableDeclaration).declarations) {
        if (
          declarator.id.type === 'Identifier' &&
          declarator.init?.type === 'CallExpression' &&
          getHocWrappedComponentName(declarator.init as estree.CallExpression) === componentName
        ) {
          hocWrappedNames.add(declarator.id.name);
        }
      }
    }
  }

  if (hocWrappedNames.size === 0) {
    return false;
  }

  return body.some(stmt => {
    if (stmt.type === 'ExportNamedDeclaration') {
      const named = stmt as estree.ExportNamedDeclaration;
      return (
        named.declaration == null &&
        named.specifiers.some(
          s => s.local.type === 'Identifier' && hocWrappedNames.has(s.local.name),
        )
      );
    }
    if (stmt.type === 'ExportDefaultDeclaration') {
      const { declaration } = stmt as estree.ExportDefaultDeclaration;
      return (
        declaration.type === 'Identifier' &&
        hocWrappedNames.has((declaration as estree.Identifier).name)
      );
    }
    return false;
  });
}
