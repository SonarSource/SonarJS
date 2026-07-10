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
import type { Rule } from 'eslint';
import ts from 'typescript';

export const USEFUL_TO_STRING = 'always';
const DEFAULT_TO_STRING = 'will';
const POSSIBLE_DEFAULT_TO_STRING = 'may';

export type ToStringClassification =
  typeof USEFUL_TO_STRING | typeof DEFAULT_TO_STRING | typeof POSSIBLE_DEFAULT_TO_STRING;

// These values are fixed on purpose. SonarJS owns the S6551 configuration and does not expose the
// upstream `no-base-to-string` options to users, so the redirection classification always runs with
// SonarJS's chosen defaults rather than any user-provided option object.
const SONAR_TO_STRING_CLASSIFICATION_OPTIONS = {
  // S6551 keeps the upstream default: an unconstrained type parameter `T` is not treated like
  // `unknown`, so `_.toString(value)` stays valid for `function f<T>(value: T)`.
  checkUnknown: false,
  // These built-ins already stringify in a meaningful way, so S6551 never redirects lodash
  // reports onto them.
  ignoredTypeNames: ['Error', 'RegExp', 'URL', 'URLSearchParams'],
} as const;

type ToStringClassificationOptions = {
  ignoredTypeNames: readonly string[];
  checkUnknown: boolean;
};

/**
 * Extracted copy of the `no-base-to-string` usefulness classification used when S6551 redirects
 * `_.toString(value)` reports from `_` to `value`.
 *
 * This mirrors `collectToStringCertainty` from `@typescript-eslint/eslint-plugin`, which is
 * internal to the upstream rule and therefore not importable. Keep it in sync when bumping
 * `@typescript-eslint/eslint-plugin` (last aligned with 8.62.0): if the upstream classification
 * changes, this copy will silently drift and must be updated to match.
 *
 * Classifies how a value will stringify at runtime:
 * - `always`: the value already has a useful string representation;
 * - `will`: every reachable type falls back to `Object.prototype.toString()`;
 * - `may`: some reachable types do and some do not.
 *
 * Examples:
 *   _.toString('x')              -> `always`
 *   _.toString({ answer: 42 })   -> `will`
 *   _.toString(value: {} | Date) -> `may`
 */
export function classifyArgumentToStringification(
  node: TSESTree.Node,
  context: Rule.RuleContext,
): ToStringClassification {
  const services = context.sourceCode.parserServices;
  const checker = services.program.getTypeChecker();
  const type = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node));
  return classifyTypeToStringification(
    type,
    checker,
    SONAR_TO_STRING_CLASSIFICATION_OPTIONS,
    new Set(),
  );
}

function classifyTypeToStringification(
  type: ts.Type,
  checker: ts.TypeChecker,
  options: ToStringClassificationOptions,
  visited: Set<ts.Type>,
): ToStringClassification {
  if (visited.has(type)) {
    return USEFUL_TO_STRING;
  }
  if (isTypeParameter(type)) {
    const constraint = type.getConstraint();
    if (constraint) {
      return classifyTypeToStringification(constraint, checker, options, visited);
    }
    return options.checkUnknown ? POSSIBLE_DEFAULT_TO_STRING : USEFUL_TO_STRING;
  }
  if (isPrimitiveStringifiable(type) || isIgnoredType(type, checker, options.ignoredTypeNames)) {
    return USEFUL_TO_STRING;
  }
  if (type.isIntersection()) {
    return classifyIntersectionStringification(type, checker, options, visited);
  }
  if (type.isUnion()) {
    return classifyUnionStringification(type, checker, options, visited);
  }
  if (checker.isTupleType(type)) {
    return classifyTupleStringification(
      type as ts.TypeReference,
      checker,
      options,
      new Set([...visited, type]),
    );
  }
  if (checker.isArrayType(type)) {
    return classifyArrayStringification(type, checker, options, new Set([...visited, type]));
  }
  switch (isToStringLikeFromObject(type, checker)) {
    case undefined:
      return options.checkUnknown && type.flags === ts.TypeFlags.Unknown
        ? POSSIBLE_DEFAULT_TO_STRING
        : USEFUL_TO_STRING;
    case true:
      return DEFAULT_TO_STRING;
    case false:
      return USEFUL_TO_STRING;
  }
}

function classifyUnionStringification(
  type: ts.UnionType,
  checker: ts.TypeChecker,
  options: ToStringClassificationOptions,
  visited: Set<ts.Type>,
): ToStringClassification {
  const classifications = type.types.map(subType =>
    classifyTypeToStringification(subType, checker, options, visited),
  );
  if (classifications.every(classification => classification === DEFAULT_TO_STRING)) {
    return DEFAULT_TO_STRING;
  }
  if (classifications.every(classification => classification === USEFUL_TO_STRING)) {
    return USEFUL_TO_STRING;
  }
  return POSSIBLE_DEFAULT_TO_STRING;
}

function classifyIntersectionStringification(
  type: ts.IntersectionType,
  checker: ts.TypeChecker,
  options: ToStringClassificationOptions,
  visited: Set<ts.Type>,
): ToStringClassification {
  for (const subType of type.types) {
    if (classifyTypeToStringification(subType, checker, options, visited) === USEFUL_TO_STRING) {
      return USEFUL_TO_STRING;
    }
  }
  return DEFAULT_TO_STRING;
}

function classifyTupleStringification(
  type: ts.TypeReference,
  checker: ts.TypeChecker,
  options: ToStringClassificationOptions,
  visited: Set<ts.Type>,
): ToStringClassification {
  const classifications = new Set(
    checker
      .getTypeArguments(type)
      .map(subType => classifyTypeToStringification(subType, checker, options, visited)),
  );
  if (classifications.has(DEFAULT_TO_STRING)) {
    return DEFAULT_TO_STRING;
  }
  if (classifications.has(POSSIBLE_DEFAULT_TO_STRING)) {
    return POSSIBLE_DEFAULT_TO_STRING;
  }
  return USEFUL_TO_STRING;
}

function classifyArrayStringification(
  type: ts.Type,
  checker: ts.TypeChecker,
  options: ToStringClassificationOptions,
  visited: Set<ts.Type>,
): ToStringClassification {
  const elementType = type.getNumberIndexType();
  if (elementType === undefined) {
    return USEFUL_TO_STRING;
  }
  return classifyTypeToStringification(elementType, checker, options, visited);
}

function isPrimitiveStringifiable(type: ts.Type) {
  return (
    (type.flags &
      (ts.TypeFlags.StringLike |
        ts.TypeFlags.NumberLike |
        ts.TypeFlags.BigIntLike |
        ts.TypeFlags.BooleanLike |
        ts.TypeFlags.ESSymbolLike |
        ts.TypeFlags.Null |
        ts.TypeFlags.Undefined |
        ts.TypeFlags.Void)) !==
    0
  );
}

function isTypeParameter(type: ts.Type) {
  return (type.flags & ts.TypeFlags.TypeParameter) !== 0;
}

function isIgnoredType(
  type: ts.Type,
  checker: ts.TypeChecker,
  ignoredTypeNames: readonly string[],
  visited = new Set<ts.Type>(),
): boolean {
  if (visited.has(type)) {
    return false;
  }
  visited.add(type);

  const name = type.aliasSymbol?.name ?? type.getSymbol()?.name;
  if (name !== undefined && ignoredTypeNames.includes(name)) {
    return true;
  }

  return getBaseTypes(type, checker).some(baseType =>
    isIgnoredType(baseType, checker, ignoredTypeNames, visited),
  );
}

function getBaseTypes(type: ts.Type, checker: ts.TypeChecker): ts.BaseType[] {
  if (!(type.flags & ts.TypeFlags.Object)) {
    return [];
  }

  const objectType = type as ts.ObjectType;
  const baseTypeOwner =
    objectType.objectFlags & ts.ObjectFlags.Reference
      ? (type as ts.TypeReference).target
      : objectType;

  if (!(baseTypeOwner.objectFlags & ts.ObjectFlags.ClassOrInterface)) {
    return [];
  }

  return checker.getBaseTypes(baseTypeOwner as ts.InterfaceType) ?? [];
}

function isToStringLikeFromObject(type: ts.Type, checker: ts.TypeChecker): boolean | undefined {
  if (
    type
      .getProperties()
      .some(
        property =>
          property.valueDeclaration !== undefined &&
          isSymbolToPrimitiveMethod(property.valueDeclaration),
      )
  ) {
    return false;
  }

  let foundFallbackOnObject = false;
  for (const propertyName of ['toLocaleString', 'toString', 'valueOf']) {
    const candidate = checker.getPropertyOfType(type, propertyName);
    if (!candidate) {
      continue;
    }
    const declarations = candidate.getDeclarations();
    if (!declarations?.length) {
      continue;
    }
    if (
      declarations.some(
        declaration =>
          !(
            ts.isInterfaceDeclaration(declaration.parent) &&
            declaration.parent.name.text === 'Object'
          ),
      )
    ) {
      return false;
    }
    foundFallbackOnObject = true;
  }
  return foundFallbackOnObject ? true : undefined;
}

function isSymbolToPrimitiveMethod(node: ts.Declaration) {
  return (
    ts.isMethodSignature(node) &&
    ts.isComputedPropertyName(node.name) &&
    ts.isPropertyAccessExpression(node.name.expression) &&
    ts.isIdentifier(node.name.expression.expression) &&
    node.name.expression.expression.text === 'Symbol' &&
    ts.isIdentifier(node.name.expression.name) &&
    node.name.expression.name.text === 'toPrimitive'
  );
}
