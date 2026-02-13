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
import { generateMeta, interceptReportForReact } from '../helpers/index.js';
import * as meta from './generated-meta.js';

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

function hasFunctionWithPropsParam(node: any): boolean {
  if (
    node &&
    (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') &&
    node.params?.length > 0
  ) {
    const firstParam = node.params[0];
    return firstParam.type === 'Identifier' && firstParam.name === 'props';
  }
  return false;
}

function isExportedPropsDeclaration(decl: estree.Declaration | null | undefined): boolean {
  if (!decl) {
    return false;
  }
  const declType = decl.type as string;
  return (
    (declType === 'TSInterfaceDeclaration' || declType === 'TSTypeAliasDeclaration') &&
    (decl as any).id?.name?.endsWith('Props')
  );
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

function isPropsPassedAsArgument(node: any): boolean {
  if (node.type !== 'CallExpression' || node.callee.type === 'Super') {
    return false;
  }
  return node.arguments.some((arg: estree.Node) => isPropsReference(arg));
}

function isPropsSpread(node: any): boolean {
  return (
    (node.type === 'SpreadElement' || node.type === 'JSXSpreadAttribute') &&
    isPropsReference(node.argument)
  );
}

function isBracketNotationOnProps(node: any): boolean {
  return node.type === 'MemberExpression' && node.computed && isPropsReference(node.object);
}

function isForwardRefCall(node: any): boolean {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'forwardRef'
  );
}

function isHocExport(node: any): boolean {
  return node.type === 'ExportDefaultDeclaration' && node.declaration?.type === 'CallExpression';
}

function isPropsInJsxExpression(node: any): boolean {
  return node.type === 'JSXExpressionContainer' && isPropsReference(node.expression);
}

function isPropsAsPropertyValue(node: any): boolean {
  return node.type === 'Property' && !node.computed && node.value && isPropsReference(node.value);
}

function isDecoratorWithPropsCallback(node: any): boolean {
  if (node.type !== 'Decorator' || node.expression?.type !== 'CallExpression') {
    return false;
  }
  return node.expression.arguments.some((arg: any) => hasFunctionWithPropsParam(arg));
}

function isIndirectPropsNode(node: any): boolean {
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

function isAstNode(value: any): boolean {
  return value != null && typeof value === 'object' && typeof value.type === 'string';
}

function collectChildNodes(node: any): any[] {
  const children: any[] = [];
  for (const key of Object.keys(node)) {
    if (key === 'parent') {
      continue;
    }
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (isAstNode(item)) {
          children.push(item);
        }
      }
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
  const stack: any[] = [ast];
  while (stack.length > 0) {
    const node = stack.pop();
    if (isIndirectPropsNode(node)) {
      return true;
    }
    for (const child of collectChildNodes(node)) {
      stack.push(child);
    }
  }
  return false;
}
