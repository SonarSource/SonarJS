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
// https://sonarsource.github.io/rspec/#/rspec/S8907/javascript

import type { Rule, Scope } from 'eslint';
import type estree from 'estree';
import ts from 'typescript';
import { generateMeta } from '../helpers/generate-meta.js';
import { getVariableFromName, isIdentifier } from '../helpers/ast.js';
import { getFullyQualifiedName, isRequire } from '../helpers/module.js';
import {
  isRequiredParserServices,
  type RequiredParserServices,
} from '../helpers/parser-services.js';
import { getTypeFromTreeNode, isAny, isArrayLikeType, isStringType } from '../helpers/type.js';
import {
  callbackCollectionMethods,
  methodNames,
  methodNamesByLowerCase,
  replacements,
  shapeDependentMethods,
  type Replacement,
} from './catalog.js';
import * as meta from './generated-meta.js';

const ES5 = 5;
const ES6 = 6;
const ES2015 = 2015;
const ES2016 = 2016;
const ECMA_VERSION_YEAR_OFFSET = ES2015 - ES6;

const STRING_INCLUDES_REASON = 'the library also accepts arrays, objects, and nullish values';

type CollectionShape = 'array' | 'string' | 'unknown';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      direct: 'Use {{alternative}} instead of {{method}}() from {{library}}.',
      cautious:
        'Consider {{alternative}} instead of {{method}}() from {{library}}; check that the behavior is equivalent because {{reason}}.',
      cautiousWithExample:
        'Consider {{alternative}} instead of {{method}}() from {{library}}; for example, use {{example}}. Check that the behavior is equivalent because {{reason}}.',
    },
  }),
  create(context: Rule.RuleContext) {
    const ecmaVersion = normalizeEcmaVersion(context.languageOptions.ecmaVersion);
    return {
      CallExpression(node: estree.Node) {
        const call = node as estree.CallExpression;
        const syntacticMethod = getSyntacticMethodName(call.callee);
        if (syntacticMethod === undefined) {
          return;
        }

        const fqn = getFullyQualifiedName(context, call);
        if (fqn === null) {
          return;
        }

        const lodashCall = getLodashCall(fqn, syntacticMethod);
        if (lodashCall === null) {
          return;
        }

        const replacement = resolveReplacement(
          lodashCall.method,
          lodashCall.replacement,
          call,
          context,
        );
        if (replacement === null || ecmaVersion < replacement.minimumEcmaVersion) {
          return;
        }

        const { library, method } = lodashCall;
        context.report({
          node: getReportNode(call.callee),
          messageId: getMessageId(replacement),
          data: {
            alternative: replacement.alternative,
            example: replacement.example ?? '',
            library,
            method,
            reason: replacement.reason ?? '',
          },
        });
      },
    };
  },
};

function getMessageId(replacement: Replacement): 'direct' | 'cautious' | 'cautiousWithExample' {
  if (replacement.reason === undefined) {
    return 'direct';
  }
  return replacement.example === undefined ? 'cautious' : 'cautiousWithExample';
}

function resolveReplacement(
  method: string,
  replacement: Replacement,
  call: estree.CallExpression,
  context: Rule.RuleContext,
): Replacement | null {
  if (!shapeDependentMethods.has(method)) {
    return replacement;
  }
  if (hasUnsupportedIteratee(method, call, context)) {
    return null;
  }
  const collection = call.arguments[0];
  if (collection === undefined || collection.type === 'SpreadElement') {
    return null;
  }
  const collectionShape = getCollectionShape(collection, context);
  if (hasUnsupportedStringSearchValue(method, call, context, collectionShape)) {
    return null;
  }
  return getShapeSpecificReplacement(method, replacement, collectionShape);
}

function hasUnsupportedIteratee(
  method: string,
  call: estree.CallExpression,
  context: Rule.RuleContext,
): boolean {
  if (!callbackCollectionMethods.has(method)) {
    return false;
  }
  const iteratee = call.arguments[1];
  return (
    iteratee === undefined ||
    iteratee.type === 'SpreadElement' ||
    isLodashShorthand(iteratee, context)
  );
}

function isLodashShorthand(node: estree.Expression, context: Rule.RuleContext): boolean {
  const value = getConstantExpression(node, context);
  return (
    value.type === 'ArrayExpression' ||
    value.type === 'Literal' ||
    value.type === 'ObjectExpression' ||
    value.type === 'TemplateLiteral'
  );
}

function hasUnsupportedStringSearchValue(
  method: string,
  call: estree.CallExpression,
  context: Rule.RuleContext,
  collectionShape: CollectionShape,
): boolean {
  if (collectionShape !== 'string' || (method !== 'contains' && method !== 'includes')) {
    return false;
  }
  const searchValue = call.arguments[1];
  return (
    searchValue?.type === 'SpreadElement' ||
    (searchValue !== undefined && isRegExpExpression(getConstantExpression(searchValue, context)))
  );
}

function getConstantExpression(
  node: estree.Expression,
  context: Rule.RuleContext,
  visited = new Set<Scope.Variable>(),
): estree.Expression {
  if (!isIdentifier(node)) {
    return node;
  }

  const variable = getVariableFromName(context, node.name, node);
  if (!variable || visited.has(variable) || variable.defs.length !== 1) {
    return node;
  }

  const definition = variable.defs[0];
  if (definition.type !== 'Variable' || definition.parent?.kind !== 'const') {
    return node;
  }

  const declarator = definition.node;
  const init = declarator.type === 'VariableDeclarator' ? declarator.init : null;
  if (init == null) {
    return node;
  }

  visited.add(variable);
  return getConstantExpression(init, context, visited);
}

function isRegExpLiteral(node: estree.Expression): boolean {
  return node.type === 'Literal' && 'regex' in node && node.regex !== undefined;
}

function isRegExpExpression(node: estree.Expression): boolean {
  return (
    isRegExpLiteral(node) ||
    ((node.type === 'CallExpression' || node.type === 'NewExpression') &&
      isIdentifier(node.callee, 'RegExp'))
  );
}

function getShapeSpecificReplacement(
  method: string,
  replacement: Replacement,
  shape: CollectionShape,
): Replacement | null {
  if (shape === 'array') {
    return replacement;
  }
  if (shape === 'string' && (method === 'contains' || method === 'includes')) {
    return {
      alternative: 'String.prototype.includes()',
      minimumEcmaVersion: ES2016,
      reason: STRING_INCLUDES_REASON,
    };
  }
  return null;
}

function getCollectionShape(node: estree.Expression, context: Rule.RuleContext): CollectionShape {
  const syntacticShape = getSyntacticCollectionShape(node);
  if (syntacticShape !== 'unknown') {
    return syntacticShape;
  }

  const services = context.sourceCode.parserServices;
  if (!isRequiredParserServices(services)) {
    return 'unknown';
  }
  return getTypeCollectionShape(node, services);
}

function getSyntacticCollectionShape(node: estree.Expression): CollectionShape {
  if (node.type === 'ChainExpression') {
    return getSyntacticCollectionShape(node.expression);
  }
  if (node.type === 'ArrayExpression') {
    return 'array';
  }
  if (node.type === 'Literal' && typeof node.value === 'string') {
    return 'string';
  }
  if (node.type === 'TemplateLiteral') {
    return 'string';
  }
  return 'unknown';
}

function getTypeCollectionShape(
  node: estree.Expression,
  services: RequiredParserServices,
): CollectionShape {
  const checker = services.program.getTypeChecker();
  const type = getTypeFromTreeNode(node, services);
  const shapes = new Set(
    getUnionTypes(type)
      .map(part => getTypePartCollectionShape(checker.getBaseTypeOfLiteralType(part), services))
      .filter(shape => shape !== 'unknown'),
  );
  return shapes.size === 1 && !getUnionTypes(type).some(isUnknownCollectionType)
    ? [...shapes][0]
    : 'unknown';
}

function getUnionTypes(type: ts.Type): ts.Type[] {
  return type.isUnion() ? type.types : [type];
}

function getTypePartCollectionShape(
  type: ts.Type,
  services: RequiredParserServices,
): CollectionShape {
  if (isUnknownCollectionType(type)) {
    return 'unknown';
  }
  if (isStringType(type)) {
    return 'string';
  }
  if (isArrayLikeType(type, services)) {
    return 'array';
  }
  return 'unknown';
}

function isUnknownCollectionType(type: ts.Type): boolean {
  return isAny(type) || (type.flags & ts.TypeFlags.Unknown) !== 0;
}

function normalizeEcmaVersion(
  ecmaVersion: Rule.RuleContext['languageOptions']['ecmaVersion'],
): number {
  if (ecmaVersion === undefined || ecmaVersion === 'latest') {
    return Number.POSITIVE_INFINITY;
  }
  if (ecmaVersion <= ES5) {
    return ecmaVersion;
  }
  return ecmaVersion < ES2015 ? ecmaVersion + ECMA_VERSION_YEAR_OFFSET : ecmaVersion;
}

function getSyntacticMethodName(
  callee: estree.Expression | estree.Super,
): string | null | undefined {
  if (callee.type === 'ChainExpression') {
    return getSyntacticMethodName(callee.expression);
  }
  if (callee.type === 'MemberExpression') {
    if (callee.computed || !isIdentifier(callee.property)) {
      return undefined;
    }
    if (isCallResult(callee.object) && !isRequire(callee.object)) {
      return undefined;
    }
    return methodNames.has(callee.property.name) ? callee.property.name : undefined;
  }
  if (callee.type === 'Identifier') {
    return null;
  }
  if (callee.type === 'CallExpression') {
    return null;
  }
  return undefined;
}

function isCallResult(node: estree.Expression | estree.Super): node is estree.CallExpression {
  if (node.type === 'ChainExpression') {
    return isCallResult(node.expression);
  }
  return node.type === 'CallExpression';
}

function getLodashCall(
  fullyQualifiedName: string,
  syntacticMethod: string | null,
): { library: string; method: string; replacement: Replacement } | null {
  const parts = fullyQualifiedName.replaceAll('/', '.').split('.');
  if (!hasSupportedImportShape(parts)) {
    return null;
  }
  const [moduleName, qualifier] = parts;
  if (moduleName === 'lodash' || moduleName === 'lodash-es') {
    return getCatalogEntry(moduleName, qualifier, syntacticMethod);
  }
  if (moduleName === 'underscore') {
    return getCatalogEntry('underscore.js', qualifier, syntacticMethod);
  }
  return null;
}

function hasSupportedImportShape(parts: string[]): boolean {
  if (parts.length !== 2) {
    return false;
  }
  const [moduleName, qualifier] = parts;
  return (
    qualifier !== undefined &&
    (moduleName === 'lodash' || moduleName === 'lodash-es' || moduleName === 'underscore')
  );
}

function getCatalogEntry(
  library: string,
  methodQualifier: string | undefined,
  syntacticMethod: string | null,
): { library: string; method: string; replacement: Replacement } | null {
  const method = getMethodName(methodQualifier, syntacticMethod);
  if (method === null) {
    return null;
  }
  return {
    library,
    method,
    replacement: replacements[method],
  };
}

function getMethodName(
  methodQualifier: string | undefined,
  syntacticMethod: string | null,
): string | null {
  if (methodQualifier === undefined) {
    return null;
  }
  if (syntacticMethod !== null) {
    return methodQualifier === syntacticMethod && methodNames.has(syntacticMethod)
      ? syntacticMethod
      : null;
  }
  if (methodNames.has(methodQualifier)) {
    return methodQualifier;
  }
  return methodNamesByLowerCase.get(methodQualifier.toLowerCase()) ?? null;
}

function getReportNode(callee: estree.Expression | estree.Super): estree.Node {
  if (callee.type === 'ChainExpression') {
    return getReportNode(callee.expression);
  }
  if (callee.type === 'MemberExpression' && isIdentifier(callee.property)) {
    return callee.property;
  }
  return callee;
}
