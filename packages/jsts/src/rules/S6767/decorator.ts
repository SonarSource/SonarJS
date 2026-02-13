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

/**
 * Checks if any props-related interface or type alias is exported.
 * Exported props types indicate a public API where props may be consumed externally.
 */
function hasExportedPropsType(ast: estree.Program): boolean {
  for (const stmt of ast.body) {
    if (stmt.type !== 'ExportNamedDeclaration') continue;

    // export interface FooProps { ... } or export type FooProps = { ... }
    const decl = stmt.declaration;
    if (decl) {
      const declType = decl.type as string;
      if (
        (declType === 'TSInterfaceDeclaration' || declType === 'TSTypeAliasDeclaration') &&
        (decl as any).id?.name?.endsWith('Props')
      ) {
        return true;
      }
    }

    // export { FooProps }
    for (const spec of stmt.specifiers) {
      const name = spec.exported.type === 'Identifier' ? spec.exported.name : undefined;
      if (name?.endsWith('Props')) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Walks the AST to detect indirect prop usage patterns:
 * - Props passed as function argument, including super(props)
 * - Props spread ({...props}, {...this.props})
 * - Bracket notation access (props[key], this.props[key])
 * - React.forwardRef wrapper
 * - HOC export (export default hoc(Comp))
 * - Props as JSX attribute value (<Provider value={props} />)
 */
function hasIndirectPattern(ast: estree.Program): boolean {
  let found = false;

  function isPropsReference(node: estree.Node): boolean {
    // props
    if (node.type === 'Identifier' && node.name === 'props') {
      return true;
    }
    // this.props
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

  function visit(node: any): void {
    if (found || node == null || typeof node !== 'object') {
      return;
    }

    // Props passed as function argument, including super(props): fn(props), fn(this.props)
    if (node.type === 'CallExpression') {
      for (const arg of node.arguments) {
        if (isPropsReference(arg)) {
          found = true;
          return;
        }
      }
    }

    // Spread: {...props} or {...this.props}
    if (node.type === 'SpreadElement' && isPropsReference(node.argument)) {
      found = true;
      return;
    }
    if (node.type === 'JSXSpreadAttribute' && isPropsReference(node.argument)) {
      found = true;
      return;
    }

    // Bracket notation: props[x] or this.props[x]
    if (node.type === 'MemberExpression' && node.computed && isPropsReference(node.object)) {
      found = true;
      return;
    }

    // React.forwardRef call
    if (
      node.type === 'CallExpression' &&
      node.callee.type === 'MemberExpression' &&
      node.callee.property.type === 'Identifier' &&
      node.callee.property.name === 'forwardRef'
    ) {
      found = true;
      return;
    }

    // HOC export: export default someCall(Component)
    if (node.type === 'ExportDefaultDeclaration' && node.declaration?.type === 'CallExpression') {
      found = true;
      return;
    }

    // Props passed as JSX attribute value: <Comp value={props} />
    if (node.type === 'JSXExpressionContainer' && isPropsReference(node.expression)) {
      found = true;
      return;
    }

    // Recurse into child nodes
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === 'object' && typeof item.type === 'string') {
            visit(item);
            if (found) return;
          }
        }
      } else if (child && typeof child === 'object' && typeof child.type === 'string') {
        visit(child);
        if (found) return;
      }
    }
  }

  visit(ast);
  return found;
}
