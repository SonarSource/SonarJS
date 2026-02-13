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
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta, interceptReportForReact } from '../helpers/index.js';
import * as meta from './generated-meta.js';

type AstNode = estree.Node | TSESTree.Node;

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, descriptor) => {
      if (hasIndirectPropsUsage(context.sourceCode.ast)) {
        return;
      }
      context.report(descriptor);
    },
  );
}

/**
 * Checks whether the file contains any pattern indicating props are used
 * indirectly, which the upstream rule cannot track.
 */
function hasIndirectPropsUsage(ast: estree.Program): boolean {
  return hasExportedPropsType(ast) || hasIndirectPattern(ast);
}

function isPropsReference(node: estree.Node): boolean {
  if (node.type === 'Identifier' && node.name === 'props') {
    return true;
  }
  return (
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.object.type === 'ThisExpression' &&
    node.property.type === 'Identifier' &&
    node.property.name === 'props'
  );
}

function hasFunctionWithPropsParam(node: AstNode): boolean {
  if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
    if (node.params.length > 0) {
      const firstParam = node.params[0];
      return firstParam.type === 'Identifier' && firstParam.name === 'props';
    }
  }
  return false;
}

function isExportedPropsDeclaration(decl: estree.Declaration | null | undefined): boolean {
  if (!decl) {
    return false;
  }
  const declType = decl.type as string;
  if (declType !== 'TSInterfaceDeclaration' && declType !== 'TSTypeAliasDeclaration') {
    return false;
  }
  const id = (decl as unknown as { id?: { name?: string } }).id;
  return id?.name?.endsWith('Props') ?? false;
}

function hasExportedPropsSpecifier(specifiers: estree.ExportSpecifier[]): boolean {
  return specifiers.some(spec => {
    const name = spec.exported.type === 'Identifier' ? spec.exported.name : undefined;
    return name?.endsWith('Props');
  });
}

/**
 * Checks if any props-related interface or type alias is exported.
 * Exported props types indicate a public API where props may be consumed externally.
 */
function hasExportedPropsType(ast: estree.Program): boolean {
  for (const stmt of ast.body) {
    if (stmt.type !== 'ExportNamedDeclaration') {
      continue;
    }
    if (isExportedPropsDeclaration(stmt.declaration)) {
      return true;
    }
    if (hasExportedPropsSpecifier(stmt.specifiers)) {
      return true;
    }
  }
  return false;
}

function isPropsPassedAsArgument(node: AstNode): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const call = node as estree.CallExpression;
  if (call.callee.type === 'Super') {
    return false;
  }
  return call.arguments.some(arg => isPropsReference(arg as estree.Node));
}

function isPropsSpread(node: AstNode): boolean {
  if (node.type === 'SpreadElement') {
    return isPropsReference(node.argument);
  }
  if (node.type === 'JSXSpreadAttribute') {
    return isPropsReference(node.argument as unknown as estree.Node);
  }
  return false;
}

function isBracketNotationOnProps(node: AstNode): boolean {
  if (node.type !== 'MemberExpression') {
    return false;
  }
  return node.computed && isPropsReference(node.object);
}

function isForwardRefCall(node: AstNode): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const call = node as estree.CallExpression;
  return (
    call.callee.type === 'MemberExpression' &&
    call.callee.property.type === 'Identifier' &&
    call.callee.property.name === 'forwardRef'
  );
}

function isHocExport(node: AstNode): boolean {
  if (node.type !== 'ExportDefaultDeclaration') {
    return false;
  }
  return node.declaration.type === 'CallExpression';
}

function isPropsInJsxExpression(node: AstNode): boolean {
  if (node.type !== 'JSXExpressionContainer') {
    return false;
  }
  const jsx = node as TSESTree.JSXExpressionContainer;
  return isPropsReference(jsx.expression as unknown as estree.Node);
}

function isPropsAsPropertyValue(node: AstNode): boolean {
  if (node.type !== 'Property') {
    return false;
  }
  const prop = node as estree.Property;
  return !prop.computed && isPropsReference(prop.value as estree.Node);
}

function isDecoratorWithPropsCallback(node: AstNode): boolean {
  if (node.type !== 'Decorator') {
    return false;
  }
  if (node.expression.type !== 'CallExpression') {
    return false;
  }
  return node.expression.arguments.some(arg => hasFunctionWithPropsParam(arg));
}

function isIndirectPropsNode(node: AstNode): boolean {
  return (
    isPropsPassedAsArgument(node) ||
    isPropsSpread(node) ||
    isBracketNotationOnProps(node) ||
    isForwardRefCall(node) ||
    isHocExport(node) ||
    isPropsInJsxExpression(node) ||
    isPropsAsPropertyValue(node) ||
    isDecoratorWithPropsCallback(node)
  );
}

function isAstNode(value: unknown): value is AstNode {
  return (
    value != null && typeof value === 'object' && 'type' in value && typeof value.type === 'string'
  );
}

function collectChildNodes(node: AstNode): AstNode[] {
  const children: AstNode[] = [];
  const record = node as unknown as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key === 'parent') {
      continue;
    }
    const child = record[key];
    if (Array.isArray(child)) {
      children.push(...child.filter(isAstNode));
    } else if (isAstNode(child)) {
      children.push(child);
    }
  }
  return children;
}

/**
 * Walks the AST to detect indirect prop usage patterns:
 * - Props passed as function argument (excludes super(props))
 * - Props spread ({...props}, {...this.props})
 * - Bracket notation access (props[key], this.props[key])
 * - React.forwardRef wrapper
 * - HOC export (export default hoc(Comp))
 * - Props as JSX attribute value (<Provider value={props} />)
 * - Props assigned as object property value ({key: props}, {key: this.props})
 * - Decorator with props parameter (@track((props) => {...}))
 */
function hasIndirectPattern(ast: estree.Program): boolean {
  const stack: AstNode[] = [ast];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (isIndirectPropsNode(node)) {
      return true;
    }
    stack.push(...collectChildNodes(node));
  }
  return false;
}
