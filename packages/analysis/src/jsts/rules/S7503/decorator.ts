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
import type { TSESTree } from '@typescript-eslint/utils';
import ts from 'typescript';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { isRequiredParserServices } from '../helpers/parser-services.js';
import type { RequiredParserServices } from '../helpers/parser-services.js';
import { hasThenMethod } from '../helpers/type.js';
import { isServerFunction } from '../helpers/nextjs.js';
import { isFunctionNode } from '../helpers/ast.js';
import type { FunctionNodeType } from '../helpers/ast.js';
import * as meta from './generated-meta.js';

// Suppresses reports on functions that must satisfy a Promise-returning contract,
// e.g. `const load: () => Promise<T> = async () => null`, and on 'use server' functions.
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    { ...rule, meta: generateMeta(meta, rule.meta) },
    (context, descriptor) => {
      const services = context.sourceCode.parserServices;
      if (
        'node' in descriptor &&
        isFunctionNode(descriptor.node) &&
        ((isRequiredParserServices(services) && hasPromiseContract(descriptor.node, services)) ||
          isServerFunction(descriptor.node, context.sourceCode))
      ) {
        return;
      }
      context.report(descriptor);
    },
  );
}

/**
 * The contract is the type the function is expected to have: the contextual type of a function
 * expression (annotation, `satisfies`, argument, default value, returned value...), or the type
 * of the member a method implements or overrides. The function's own return type annotation is
 * not a contract, since it is the very thing that `async` satisfies.
 */
function hasPromiseContract(node: FunctionNodeType, services: RequiredParserServices): boolean {
  const checker = services.program.getTypeChecker();
  const tsNode = services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node);
  if (ts.isFunctionExpression(tsNode) || ts.isArrowFunction(tsNode)) {
    return returnsThenable(getContract(tsNode, checker), checker);
  }
  if (ts.isMethodDeclaration(tsNode)) {
    return getMemberContracts(tsNode, checker).some(type => returnsThenable(type, checker));
  }
  return false;
}

/**
 * Methods have no contextual type, so the contract is looked up by name in the object literal's
 * contextual type or in the types the class extends or implements.
 */
function getMemberContracts(method: ts.MethodDeclaration, checker: ts.TypeChecker): ts.Type[] {
  const name = checker.getSymbolAtLocation(method.name)?.name;
  if (name === undefined) {
    return [];
  }
  const owner = method.parent;
  let ownerContracts: ts.Type[] = [];
  if (ts.isObjectLiteralExpression(owner)) {
    const contextualType = getContract(owner, checker);
    ownerContracts = contextualType ? [checker.getNonNullableType(contextualType)] : [];
  } else if (
    ts.isClassLike(owner) &&
    !(ts.getCombinedModifierFlags(method) & ts.ModifierFlags.Static)
  ) {
    ownerContracts = (owner.heritageClauses ?? [])
      .flatMap(clause => clause.types)
      .map(heritage => checker.getTypeAtLocation(heritage));
  }
  return ownerContracts.flatMap(contract => {
    const member = contract.getProperty(name);
    return member ? [checker.getTypeOfSymbol(member)] : [];
  });
}

/**
 * A generic call can infer its type arguments from the argument itself, e.g. `memoize(async () => {})`
 * infers `T` as the function's own type, so contextual types under generic calls are not contracts.
 */
function getContract(node: ts.Expression, checker: ts.TypeChecker): ts.Type | undefined {
  return isInferredFromGenericCall(node, checker) ? undefined : checker.getContextualType(node);
}

/**
 * Walks up to the enclosing call argument, e.g. `useMemo(() => async () => {})`, as long as each
 * parent passes its contextual type down to the child.
 */
function isInferredFromGenericCall(node: ts.Node, checker: ts.TypeChecker): boolean {
  for (let child = node, parent = node.parent; parent; child = parent, parent = parent.parent) {
    if (
      (ts.isCallExpression(parent) || ts.isNewExpression(parent)) &&
      parent.arguments?.includes(child as ts.Expression)
    ) {
      return isGeneric(checker.getResolvedSignature(parent)?.getDeclaration());
    }
    if (!propagatesContextualType(parent, child)) {
      return false;
    }
  }
  return false;
}

/**
 * Constructors do not declare type parameters themselves, their class does.
 */
function isGeneric(declaration: ts.SignatureDeclaration | undefined): boolean {
  if (declaration === undefined) {
    return false;
  }
  return (
    !!declaration.typeParameters?.length ||
    (ts.isConstructorDeclaration(declaration) && !!declaration.parent.typeParameters?.length)
  );
}

/**
 * Anything else, e.g. JSX attributes, assignments or type annotations, provides its own contextual type.
 */
function propagatesContextualType(parent: ts.Node, child: ts.Node): boolean {
  return (
    ts.isParenthesizedExpression(parent) ||
    ts.isArrayLiteralExpression(parent) ||
    ts.isObjectLiteralExpression(parent) ||
    ts.isPropertyAssignment(parent) ||
    (ts.isConditionalExpression(parent) && parent.condition !== child) ||
    ts.isReturnStatement(parent) ||
    ts.isBlock(parent) ||
    ((ts.isArrowFunction(parent) || ts.isFunctionExpression(parent)) &&
      parent.body === child &&
      parent.type === undefined)
  );
}

function returnsThenable(type: ts.Type | undefined, checker: ts.TypeChecker): boolean {
  if (!type) {
    return false;
  }
  const signatures = checker.getNonNullableType(type).getCallSignatures();
  return (
    signatures.length > 0 &&
    signatures.every(signature => hasThenMethod(signature.getReturnType(), checker))
  );
}
