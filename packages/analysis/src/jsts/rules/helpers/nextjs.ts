/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import type { TSESTree } from '@typescript-eslint/utils';
import type { SourceCode } from 'eslint';
import type estree from 'estree';
import type { FunctionNodeType } from './ast.js';

const USE_SERVER_DIRECTIVE = 'use server';

/**
 * Returns true when `node` is a Server Function: a function with its own 'use server'
 * directive, or a function exported from a 'use server' module.
 *
 * @see https://nextjs.org/docs/app/api-reference/directives/use-server
 */
export function isServerFunction(node: FunctionNodeType, sourceCode: SourceCode): boolean {
  if (node.body.type === 'BlockStatement' && hasUseServerDirective(node.body.body)) {
    return true;
  }
  return hasUseServerDirective(sourceCode.ast.body) && isExported(node, sourceCode);
}

// Directives only appear in the prologue, so stop at the first other statement.
function hasUseServerDirective(statements: estree.Node[]): boolean {
  for (const statement of statements) {
    if (
      statement.type !== 'ExpressionStatement' ||
      !('directive' in statement) ||
      typeof statement.directive !== 'string'
    ) {
      return false;
    }
    if (statement.directive === USE_SERVER_DIRECTIVE) {
      return true;
    }
  }
  return false;
}

function isExported(node: FunctionNodeType, sourceCode: SourceCode): boolean {
  const parent = (node as TSESTree.Node).parent;
  if (parent?.type === 'ExportNamedDeclaration' || parent?.type === 'ExportDefaultDeclaration') {
    return true;
  }
  const declarator = parent?.type === 'VariableDeclarator' ? parent : undefined;
  if (declarator?.parent.parent?.type === 'ExportNamedDeclaration') {
    return true;
  }
  const declaration =
    node.type === 'FunctionDeclaration' ? node : (declarator as estree.Node | undefined);
  if (!declaration) {
    return false;
  }
  return sourceCode
    .getDeclaredVariables(declaration)
    .some(variable => variable.references.some(({ identifier }) => isExportReference(identifier)));
}

// `export { action }` or `export default action`
function isExportReference(identifier: estree.Node): boolean {
  const node = identifier as TSESTree.Node;
  const parent = node.parent;
  return (
    (parent?.type === 'ExportSpecifier' && parent.local === node) ||
    (parent?.type === 'ExportDefaultDeclaration' && parent.declaration === node)
  );
}
