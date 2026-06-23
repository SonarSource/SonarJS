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

import type { Rule } from 'eslint';
import type estree from 'estree';
import ts from 'typescript';
import { generateMeta } from '../helpers/generate-meta.js';
import { isIdentifier } from '../helpers/ast.js';
import { getFullyQualifiedName, isRequire } from '../helpers/module.js';
import {
  isRequiredParserServices,
  type RequiredParserServices,
} from '../helpers/parser-services.js';
import {
  getTypeFromTreeNode,
  isAny,
  isArrayLikeType,
  isObjectType,
  isStringType,
} from '../helpers/type.js';
import * as meta from './generated-meta.js';

type Replacement = {
  alternative: string;
  minimumEcmaVersion: number;
  reason?: string;
  example?: string;
};

const ES5 = 5;
const ES6 = 6;
const ES2015 = 2015;
const ES2016 = 2016;
const ES2017 = 2017;
const ES2019 = 2019;
const ECMA_VERSION_YEAR_OFFSET = ES2015 - ES6;

const ARRAY_NULLISH_REASON = 'the library handles nullish values differently from the native API';
const COLLECTION_REASON = 'the library also accepts objects and nullish values';
const COLLECTION_PREDICATE_REASON =
  'the library also accepts objects, nullish values, and shorthand predicates';
const OBJECT_COLLECTION_REASON =
  'the library handles nullish values differently and object iteratees receive value, key, and collection';
const STRING_COERCION_REASON =
  'the library coerces values and handles nullish values differently from the native API';
const STRING_INCLUDES_REASON = 'the library also accepts arrays, objects, and nullish values';
const ASSIGN_REASON = 'the library handles nullish targets differently from Object.assign';

const replacements: Record<string, Replacement> = {
  all: cautious('Array.prototype.every()', COLLECTION_PREDICATE_REASON, ES5),
  any: cautious('Array.prototype.some()', COLLECTION_PREDICATE_REASON, ES5),
  assign: cautious('Object.assign()', ASSIGN_REASON, ES2015),
  bind: cautious(
    'Function.prototype.bind()',
    'argument handling is not identical',
    ES5,
    '`fn.bind(thisArg, ...args)`',
  ),
  collect: cautious('Array.prototype.map()', COLLECTION_REASON, ES5),
  concat: cautious('Array.prototype.concat()', ARRAY_NULLISH_REASON, ES5),
  contains: cautious(
    'Array.prototype.includes()',
    'the library also accepts strings, objects, and nullish values',
    ES2016,
  ),
  detect: cautious('Array.prototype.find()', COLLECTION_PREDICATE_REASON, ES2015),
  drop: cautious('Array.prototype.slice()', ARRAY_NULLISH_REASON, ES5, '`array.slice(n)`'),
  dropRight: cautious('Array.prototype.slice()', ARRAY_NULLISH_REASON, ES5, '`array.slice(0, -n)`'),
  each: cautious('Array.prototype.forEach()', COLLECTION_PREDICATE_REASON, ES5),
  endsWith: cautious('String.prototype.endsWith()', STRING_COERCION_REASON, ES2015),
  entries: cautious('Object.entries()', ARRAY_NULLISH_REASON, ES2017),
  every: cautious('Array.prototype.every()', COLLECTION_PREDICATE_REASON, ES5),
  extendOwn: cautious('Object.assign()', ARRAY_NULLISH_REASON, ES2015),
  fill: cautious('Array.prototype.fill()', ARRAY_NULLISH_REASON, ES2015),
  filter: cautious('Array.prototype.filter()', COLLECTION_PREDICATE_REASON, ES5),
  find: cautious('Array.prototype.find()', COLLECTION_PREDICATE_REASON, ES2015),
  findIndex: cautious('Array.prototype.findIndex()', COLLECTION_PREDICATE_REASON, ES2015),
  flatten: cautious(
    'Array.prototype.flat()',
    'the library handles nullish values differently from the native API',
    ES2019,
  ),
  foldl: cautious('Array.prototype.reduce()', COLLECTION_PREDICATE_REASON, ES5),
  foldr: cautious('Array.prototype.reduceRight()', COLLECTION_PREDICATE_REASON, ES5),
  forEach: cautious('Array.prototype.forEach()', COLLECTION_PREDICATE_REASON, ES5),
  includes: cautious(
    'Array.prototype.includes()',
    'the library also accepts strings, objects, and nullish values',
    ES2016,
  ),
  indexOf: cautious('Array.prototype.indexOf()', ARRAY_NULLISH_REASON, ES5),
  inject: cautious('Array.prototype.reduce()', COLLECTION_PREDICATE_REASON, ES5),
  isArray: direct('Array.isArray()', ES5),
  isFinite: cautious(
    'Number.isFinite()',
    'the library can handle non-number values differently from Number.isFinite',
    ES2015,
  ),
  isInteger: direct('Number.isInteger()', ES2015),
  isNaN: cautious('Number.isNaN()', 'boxed Number objects are handled differently', ES2015),
  join: cautious('Array.prototype.join()', ARRAY_NULLISH_REASON, ES5),
  keys: cautious('Object.keys()', ARRAY_NULLISH_REASON, ES5),
  lastIndexOf: cautious('Array.prototype.lastIndexOf()', ARRAY_NULLISH_REASON, ES5),
  map: cautious('Array.prototype.map()', COLLECTION_REASON, ES5),
  padEnd: cautious('String.prototype.padEnd()', STRING_COERCION_REASON, ES2017),
  padStart: cautious('String.prototype.padStart()', STRING_COERCION_REASON, ES2017),
  pairs: cautious('Object.entries()', ARRAY_NULLISH_REASON, ES2017),
  reduce: cautious('Array.prototype.reduce()', COLLECTION_PREDICATE_REASON, ES5),
  reduceRight: cautious('Array.prototype.reduceRight()', COLLECTION_PREDICATE_REASON, ES5),
  repeat: cautious('String.prototype.repeat()', STRING_COERCION_REASON, ES2015),
  replace: cautious('String.prototype.replace()', STRING_COERCION_REASON, ES5),
  reverse: cautious('Array.prototype.reverse()', ARRAY_NULLISH_REASON, ES5),
  select: cautious('Array.prototype.filter()', COLLECTION_PREDICATE_REASON, ES5),
  slice: cautious('Array.prototype.slice()', ARRAY_NULLISH_REASON, ES5),
  some: cautious('Array.prototype.some()', COLLECTION_PREDICATE_REASON, ES5),
  split: cautious('String.prototype.split()', STRING_COERCION_REASON, ES5),
  startsWith: cautious('String.prototype.startsWith()', STRING_COERCION_REASON, ES2015),
  takeRight: cautious('Array.prototype.slice()', ARRAY_NULLISH_REASON, ES5, '`array.slice(-n)`'),
  toLower: cautious('String.prototype.toLowerCase()', STRING_COERCION_REASON, ES5),
  toPairs: cautious('Object.entries()', ARRAY_NULLISH_REASON, ES2017),
  toUpper: cautious('String.prototype.toUpperCase()', STRING_COERCION_REASON, ES5),
  trim: cautious('String.prototype.trim()', STRING_COERCION_REASON, ES5),
  uniq: cautious('Set', ARRAY_NULLISH_REASON, ES2015, '`[...new Set(values)]`'),
  values: cautious('Object.values()', ARRAY_NULLISH_REASON, ES2017),
};

const methodNames = new Set(Object.keys(replacements));
const methodNamesByLowerCase = new Map(
  Object.keys(replacements).map(method => [method.toLowerCase(), method]),
);
const OBJECT_REDUCE_ALTERNATIVE =
  'Object.values() or Object.entries() with Array.prototype.reduce()';
const shapeDependentMethods = new Set([
  'all',
  'any',
  'collect',
  'contains',
  'detect',
  'each',
  'every',
  'filter',
  'find',
  'findIndex',
  'foldl',
  'foldr',
  'forEach',
  'includes',
  'inject',
  'map',
  'reduce',
  'reduceRight',
  'select',
  'some',
]);
const callbackCollectionMethods = new Set(
  [...shapeDependentMethods].filter(method => method !== 'contains' && method !== 'includes'),
);
const objectCollectionAlternatives: Record<string, string> = {
  all: 'Object.values() or Object.entries() with Array.prototype.every()',
  any: 'Object.values() or Object.entries() with Array.prototype.some()',
  collect: 'Object.values() or Object.entries() with Array.prototype.map()',
  contains: 'Object.values() with Array.prototype.includes()',
  detect: 'Object.values() or Object.entries() with Array.prototype.find()',
  each: 'Object.values() or Object.entries() with Array.prototype.forEach()',
  every: 'Object.values() or Object.entries() with Array.prototype.every()',
  filter: 'Object.values() or Object.entries() with Array.prototype.filter()',
  find: 'Object.values() or Object.entries() with Array.prototype.find()',
  findIndex: 'Object.values() or Object.entries() with Array.prototype.findIndex()',
  foldl: OBJECT_REDUCE_ALTERNATIVE,
  foldr: 'Object.values() or Object.entries() with Array.prototype.reduceRight()',
  forEach: 'Object.values() or Object.entries() with Array.prototype.forEach()',
  includes: 'Object.values() with Array.prototype.includes()',
  inject: OBJECT_REDUCE_ALTERNATIVE,
  map: 'Object.values() or Object.entries() with Array.prototype.map()',
  reduce: OBJECT_REDUCE_ALTERNATIVE,
  reduceRight: 'Object.values() or Object.entries() with Array.prototype.reduceRight()',
  select: 'Object.values() or Object.entries() with Array.prototype.filter()',
  some: 'Object.values() or Object.entries() with Array.prototype.some()',
};

type CollectionShape = 'array' | 'object' | 'string' | 'unknown';

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

function direct(alternative: string, minimumEcmaVersion: number): Replacement {
  return { alternative, minimumEcmaVersion };
}

function cautious(
  alternative: string,
  reason: string,
  minimumEcmaVersion: number,
  example?: string,
): Replacement {
  return { alternative, reason, minimumEcmaVersion, example };
}

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
  if (method === 'trim' && call.arguments.length > 1) {
    return null;
  }
  if (!shapeDependentMethods.has(method)) {
    return replacement;
  }
  if (hasUnsupportedIteratee(method, call)) {
    return null;
  }
  const collection = call.arguments[0];
  if (collection === undefined || collection.type === 'SpreadElement') {
    return null;
  }
  return getShapeSpecificReplacement(method, replacement, getCollectionShape(collection, context));
}

function hasUnsupportedIteratee(method: string, call: estree.CallExpression): boolean {
  if (!callbackCollectionMethods.has(method)) {
    return false;
  }
  const iteratee = call.arguments[1];
  return iteratee === undefined || iteratee.type === 'SpreadElement' || isLodashShorthand(iteratee);
}

function isLodashShorthand(node: estree.Expression): boolean {
  return (
    node.type === 'ArrayExpression' ||
    node.type === 'Literal' ||
    node.type === 'ObjectExpression' ||
    node.type === 'TemplateLiteral'
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
    return cautious('String.prototype.includes()', STRING_INCLUDES_REASON, ES2016);
  }
  if (shape === 'object') {
    return cautious(objectCollectionAlternatives[method], OBJECT_COLLECTION_REASON, ES2017);
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
  if (node.type === 'ObjectExpression') {
    return 'object';
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
  if (isObjectType(type) && type.getCallSignatures().length === 0) {
    return 'object';
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
