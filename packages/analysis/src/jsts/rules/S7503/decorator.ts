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
// https://sonarsource.github.io/rspec/#/rspec/S7503/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import type ts from 'typescript';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { isRequiredParserServices } from '../helpers/parser-services.js';
import type { RequiredParserServices } from '../helpers/parser-services.js';
import { hasThenMethod } from '../helpers/type.js';
import { isFunctionNode } from '../helpers/ast.js';
import type { FunctionNodeType } from '../helpers/ast.js';
import * as meta from './generated-meta.js';

// Suppresses reports on async defaults of Promise-returning typed parameters,
// e.g. `loader: () => Promise<T> = async () => null`, and on 'use server' functions.
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    { ...rule, meta: generateMeta(meta, rule.meta) },
    (context, descriptor) => {
      const services = context.sourceCode.parserServices;
      if (
        'node' in descriptor &&
        ((isRequiredParserServices(services) &&
          isTypedPromiseReturningDefault(descriptor.node, services)) ||
          isServerFunction(descriptor.node, context))
      ) {
        return;
      }
      context.report(descriptor);
    },
  );
}

/**
 * Reads the type from the annotation, not the parameter, so untyped parameters never qualify.
 */
function isTypedPromiseReturningDefault(
  node: estree.Node,
  services: RequiredParserServices,
): boolean {
  const parent = (node as TSESTree.Node).parent;
  if (parent?.type !== 'AssignmentPattern') {
    return false;
  }
  const typeAnnotation = parent.left.typeAnnotation?.typeAnnotation;
  if (!typeAnnotation) {
    return false;
  }
  const checker = services.program.getTypeChecker();
  const declaredType = checker.getNonNullableType(
    checker.getTypeFromTypeNode(services.esTreeNodeToTSNodeMap.get(typeAnnotation) as ts.TypeNode),
  );
  const signatures = declaredType.getCallSignatures();
  return (
    signatures.length > 0 &&
    signatures.every(signature => hasThenMethod(signature.getReturnType(), checker))
  );
}

/**
 * Server Functions must be async even without `await`: either the function has its own
 * 'use server' directive, or it is exported from a 'use server' module.
 */
function isServerFunction(node: estree.Node, context: Rule.RuleContext): boolean {
  if (!isFunctionNode(node)) {
    return false;
  }
  if (node.body.type === 'BlockStatement' && hasUseServerDirective(node.body.body)) {
    return true;
  }
  return hasUseServerDirective(context.sourceCode.ast.body) && isExported(node, context);
}

// Parsers only set `directive` on directive-prologue entries.
function hasUseServerDirective(statements: estree.Node[]): boolean {
  return statements.some(
    statement =>
      statement.type === 'ExpressionStatement' &&
      'directive' in statement &&
      statement.directive === 'use server',
  );
}

function isExported(node: FunctionNodeType, context: Rule.RuleContext): boolean {
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
  return context.sourceCode
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
