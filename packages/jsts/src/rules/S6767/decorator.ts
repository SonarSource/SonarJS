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

import type { Rule } from 'eslint';
import type { Node, Program } from 'estree';
import { generateMeta, interceptReportForReact } from '../helpers/index.js';
import * as meta from './generated-meta.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  const cache = new WeakMap<Program, boolean>();
  return interceptReportForReact(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, descriptor) => {
      const ast = context.sourceCode.ast;
      let result = cache.get(ast);
      if (result === undefined) {
        result = hasIndirectPropsUsage(ast);
        cache.set(ast, result);
      }
      if (result) {
        return;
      }
      context.report(descriptor);
    },
  );
}

/**
 * Checks if the file contains any pattern indicating that props are used
 * indirectly (passed to functions, spread, dynamic access, etc.).
 * When such patterns exist, the upstream rule's unused-prop reports are
 * likely false positives.
 */
function hasIndirectPropsUsage(ast: Program): boolean {
  return hasPattern(ast, isIndirectPropsUsageNode);
}

function hasPattern(node: Node, predicate: (node: Node) => boolean): boolean {
  if (predicate(node)) {
    return true;
  }
  for (const key of Object.keys(node)) {
    if (key === 'parent') {
      continue;
    }
    const child = (node as unknown as Record<string, unknown>)[key];
    if (isNode(child)) {
      if (hasPattern(child, predicate)) {
        return true;
      }
    } else if (Array.isArray(child)) {
      for (const element of child) {
        if (isNode(element) && hasPattern(element, predicate)) {
          return true;
        }
      }
    }
  }
  return false;
}

function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && 'type' in value;
}

function isIndirectPropsUsageNode(node: Node): boolean {
  return (
    isPropsPassedToFunction(node) ||
    isPropsSpread(node) ||
    isSuperPropsCall(node) ||
    isPropsBracketAccess(node) ||
    isExportedPropsInterface(node) ||
    isHocExport(node) ||
    isForwardRefWrapper(node) ||
    isPropsPassedToContextProvider(node)
  );
}

/** props or this.props passed as argument to any function call */
function isPropsPassedToFunction(node: Node): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  return node.arguments.some(isPropsReference);
}

/** {...props} or {...this.props} in object or JSX, or rest destructuring from props */
function isPropsSpread(node: Node): boolean {
  if (node.type === 'SpreadElement') {
    return isPropsReference(node.argument);
  }
  if (node.type === 'JSXSpreadAttribute') {
    return isPropsReference((node as unknown as { argument: Node }).argument);
  }
  // const { x, ...rest } = props
  if (
    node.type === 'VariableDeclarator' &&
    node.id.type === 'ObjectPattern' &&
    node.init != null &&
    isPropsReference(node.init) &&
    node.id.properties.some(p => p.type === 'RestElement')
  ) {
    return true;
  }
  return false;
}

/** super(props) in constructor */
function isSuperPropsCall(node: Node): boolean {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'Super' &&
    node.arguments.length > 0 &&
    isPropsReference(node.arguments[0])
  );
}

/** props[key] or this.props[key] */
function isPropsBracketAccess(node: Node): boolean {
  return node.type === 'MemberExpression' && node.computed && isPropsReference(node.object);
}

/** export interface/type for props */
function isExportedPropsInterface(node: Node): boolean {
  if (node.type !== 'ExportNamedDeclaration' || !node.declaration) {
    return false;
  }
  const decl = node.declaration;
  if (decl.type === ('TSInterfaceDeclaration' as string)) {
    return true;
  }
  if (decl.type === ('TSTypeAliasDeclaration' as string)) {
    return true;
  }
  return false;
}

/** export default SomeHoc(Component) */
function isHocExport(node: Node): boolean {
  if (node.type === 'ExportDefaultDeclaration') {
    return node.declaration.type === 'CallExpression';
  }
  return false;
}

/** React.forwardRef wrapper */
function isForwardRefWrapper(node: Node): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const callee = node.callee;
  if (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'React' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'forwardRef'
  ) {
    return true;
  }
  if (callee.type === 'Identifier' && callee.name === 'forwardRef') {
    return true;
  }
  return false;
}

/** Props object passed to context provider value={props} */
function isPropsPassedToContextProvider(node: Node): boolean {
  if (node.type !== 'JSXAttribute') {
    return false;
  }
  const attr = node as unknown as { name: { name?: string }; value: Node | null };
  if (attr.name?.name !== 'value') {
    return false;
  }
  if (attr.value && attr.value.type === ('JSXExpressionContainer' as string)) {
    const container = attr.value as unknown as { expression: Node };
    return isPropsReference(container.expression);
  }
  return false;
}

/** Matches `props` identifier or `this.props` member expression */
function isPropsReference(node: Node): boolean {
  if (node.type === 'Identifier' && node.name === 'props') {
    return true;
  }
  if (
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.object.type === 'ThisExpression' &&
    node.property.type === 'Identifier' &&
    node.property.name === 'props'
  ) {
    return true;
  }
  return false;
}
