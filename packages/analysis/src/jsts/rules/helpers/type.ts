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
import type estree from 'estree';
import ts from 'typescript';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import type { RequiredParserServices } from './parser-services.js';
import { getVariableFromScope } from './ast.js';
import type { Rule } from 'eslint';

export type RuleContext = TSESLint.RuleContext<string, string[]>;

/**
 * Returns true when `node` resolves to the built-in `Array` type.
 */
export function isArray(node: estree.Node, services: RequiredParserServices) {
  const type = getTypeFromTreeNode(node, services);
  return type.symbol?.name === 'Array';
}

/**
 * TypeScript provides a set of utility types to facilitate type transformations.
 * @see https://www.typescriptlang.org/docs/handbook/utility-types.html
 */
export const UTILITY_TYPES = new Set([
  'Awaited',
  'Partial',
  'Required',
  'Readonly',
  'Record',
  'Pick',
  'Omit',
  'Exclude',
  'Extract',
  'NonNullable',
  'Parameters',
  'ConstructorParameters',
  'ReturnType',
  'InstanceType',
  'ThisParameterType',
  'OmitThisParameter',
  'ThisType',
  'Uppercase',
  'Lowercase',
  'Capitalize',
  'Uncapitalize',
]);

/**
 * JavaScript typed arrays
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Typed_arrays
 */
const TYPED_ARRAY_TYPES = new Set([
  'Int8Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Int16Array',
  'Uint16Array',
  'Int32Array',
  'Uint32Array',
  'Float32Array',
  'Float64Array',
  'BigInt64Array',
  'BigUint64Array',
]);

/**
 * Checks if the provided node is a JS typed array like "BigInt64Array". See TYPED_ARRAY_TYPES
 *
 * @param node
 * @param services
 * @returns
 */
export function isTypedArray(node: estree.Node, services: RequiredParserServices) {
  const type = getTypeFromTreeNode(node, services);
  return TYPED_ARRAY_TYPES.has(type.symbol?.name);
}

/**
 * Returns true when `node` resolves to a string-like type.
 */
export function isString(node: estree.Node, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  const typ = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node));
  return (typ.getFlags() & ts.TypeFlags.StringLike) !== 0;
}

/**
 * Returns true when `node` resolves to a number-like type.
 */
export function isNumber(node: estree.Node, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  const typ = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node));
  return (typ.getFlags() & ts.TypeFlags.NumberLike) !== 0;
}

/**
 * Returns true when `type` is bigint-like.
 */
export function isBigIntType(type: ts.Type) {
  return (type.getFlags() & ts.TypeFlags.BigIntLike) !== 0;
}

/**
 * Returns true when `type` is number-like.
 */
export function isNumberType(type: ts.Type) {
  return (type.getFlags() & ts.TypeFlags.NumberLike) !== 0;
}

/**
 * Returns true when `type` is string-like.
 */
export function isStringType(type: ts.Type) {
  return (type.flags & ts.TypeFlags.StringLike) > 0 || type.symbol?.name === 'String';
}

/**
 * Returns true when `node` resolves to a function type.
 */
export function isFunction(node: estree.Node, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  const type = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node));
  return type.symbol && (type.symbol.flags & ts.SymbolFlags.Function) !== 0;
}

/**
 * Returns true when `node` resolves to a union type.
 */
export function isUnion(node: estree.Node, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  const type = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node));
  return type.isUnion();
}

/**
 * Returns an array of the union types if the provided type is a union.
 * Otherwise, returns an array containing the provided type as its unique element.
 * @param type A TypeScript type.
 * @return An array of types. It's never empty.
 */
function getUnionTypes(type: ts.Type): ts.Type[] {
  return type.isUnion() ? type.types : [type];
}

/**
 * Returns true when `node` resolves to `undefined`, `null`, or a union containing either.
 */
export function isUndefinedOrNull(node: estree.Node, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  const typ = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node));
  return (
    (typ.getFlags() & ts.TypeFlags.Undefined) !== 0 || (typ.getFlags() & ts.TypeFlags.Null) !== 0
  );
}

/**
 * Returns true when `node` resolves to a thenable type.
 */
export function isThenable(node: estree.Node, services: RequiredParserServices) {
  const mapped = services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node);
  const checker = services.program.getTypeChecker();
  return hasThenMethod(checker.getTypeAtLocation(mapped), checker);
}

/**
 * Checks if a node's type is either:
 * - Thenable (Promise-like), OR
 * - A union where ALL members are either thenable or "nothing" types (void, undefined, null)
 *
 * This is useful for rules like S3735 that allow voiding Promise operations,
 * including cases like optional chaining (Promise<T> | undefined) or
 * optional async callbacks (() => void | Promise<void>).
 */
export function isThenableOrVoidUnion(node: estree.Node, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  const type = getTypeFromTreeNode(node, services);
  const unionTypes = type.isUnion() ? type.types : [type];
  let hasThenable = false;
  let allThenableOrVoid = true;

  for (const unionType of unionTypes) {
    const isThenable = hasThenMethod(unionType, checker);
    const isNothingType =
      (unionType.flags & (ts.TypeFlags.Void | ts.TypeFlags.Undefined | ts.TypeFlags.Null)) !== 0;
    hasThenable ||= isThenable;
    allThenableOrVoid &&= isThenable || isNothingType;
  }

  return hasThenable && allThenableOrVoid;
}

function hasThenMethod(type: ts.Type, checker: ts.TypeChecker): boolean {
  const thenProperty = type.getProperty('then');
  if (!thenProperty) {
    return false;
  }
  const thenType = checker.getTypeOfSymbol(thenProperty);
  return thenType.getCallSignatures().length > 0;
}

/**
 * Returns true when `type` is exactly `any`.
 */
export function isAny(type: ts.Type) {
  return type.flags === ts.TypeFlags.Any;
}

/**
 * Returns true when both types are specific enough to compare (neither `any`
 * nor `unknown`) and are mutually assignable.
 *
 * Mutual assignability is stricter than symbol equality for generic aliases:
 * `Props<User>` and `Props<Product>` share the same alias symbol, but they are
 * not mutually assignable and therefore do not represent the same effective type.
 */
export function areMutuallyAssignableTypes(
  checker: ts.TypeChecker,
  left: ts.Type | undefined,
  right: ts.Type | undefined,
): boolean {
  if (!left || !right || isAnyOrUnknownType(left) || isAnyOrUnknownType(right)) {
    return false;
  }

  // @ts-ignore -- isTypeAssignableTo is a private TypeScript API
  return checker.isTypeAssignableTo(left, right) && checker.isTypeAssignableTo(right, left);
}

/**
 * Returns true when both types come from the same named declaration and, for
 * generic declarations, are instantiated with the same type arguments.
 *
 * The comparison has two steps:
 * 1. the declarations must resolve to the same symbol
 * 2. each type argument must match through `areSameTypeArguments(...)`
 *
 * That helper can call back into this function for named type arguments, so
 * generic comparisons recurse through nested declarations.
 *
 * This is intentionally stricter than structural equality: `Props<User>` and
 * `Props<Product>` are different, and `Props<User>` also stays different from
 * `Props<{ id: string }>` even if the shapes happen to match.
 */
export function areSameTypeDeclarations(
  checker: ts.TypeChecker,
  left: ts.Type | undefined,
  right: ts.Type | undefined,
): boolean {
  if (!left || !right || isAnyOrUnknownType(left) || isAnyOrUnknownType(right)) {
    return false;
  }

  const leftSymbol = getComparableDeclaredTypeSymbol(left);
  const rightSymbol = getComparableDeclaredTypeSymbol(right);
  if (!leftSymbol || leftSymbol !== rightSymbol) {
    return false;
  }

  const leftArgs = getDeclaredTypeArguments(left, checker);
  const rightArgs = getDeclaredTypeArguments(right, checker);
  return (
    leftArgs.length === rightArgs.length &&
    leftArgs.every((argument, index) => areSameTypeArguments(checker, argument, rightArgs[index]))
  );
}

function areSameTypeArguments(
  checker: ts.TypeChecker,
  left: ts.Type | undefined,
  right: ts.Type | undefined,
): boolean {
  if (!left || !right) {
    return false;
  }

  if (isAnyOrUnknownType(left) || isAnyOrUnknownType(right)) {
    return (
      isAnyOrUnknownType(left) &&
      isAnyOrUnknownType(right) &&
      checker.typeToString(left) === checker.typeToString(right)
    );
  }

  const leftSymbol = getComparableDeclaredTypeSymbol(left);
  const rightSymbol = getComparableDeclaredTypeSymbol(right);
  if (leftSymbol || rightSymbol) {
    // Keep named type arguments distinct from anonymous structural literals.
    return leftSymbol !== undefined && leftSymbol === rightSymbol
      ? areSameTypeDeclarations(checker, left, right)
      : false;
  }

  // Primitives, unions, tuples, and anonymous object literals do not have a
  // stable declared type symbol, so compare their effective instantiated form.
  return checker.typeToString(left) === checker.typeToString(right);
}

function isAnyOrUnknownType(type: ts.Type): boolean {
  return (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) !== 0;
}

/**
 * Returns the symbol to use for declaration-based comparisons.
 *
 * Anonymous type literals such as `{ id: string }` are intentionally excluded:
 * their `TypeLiteral` symbols do not represent stable declaration identities.
 * Named interfaces and type aliases are still kept because we prefer
 * `aliasSymbol` over the underlying `TypeLiteral` symbol.
 */
function getComparableDeclaredTypeSymbol(type: ts.Type): ts.Symbol | undefined {
  const symbol = type.aliasSymbol ?? type.symbol;
  return symbol && (symbol.flags & ts.SymbolFlags.TypeLiteral) === 0 ? symbol : undefined;
}

function getDeclaredTypeArguments(type: ts.Type, checker: ts.TypeChecker): readonly ts.Type[] {
  if (type.aliasTypeArguments?.length) {
    return type.aliasTypeArguments;
  }

  return isTypeReference(type) ? checker.getTypeArguments(type) : [];
}

function isTypeReference(type: ts.Type): type is ts.TypeReference {
  return (
    (type.flags & ts.TypeFlags.Object) !== 0 &&
    ((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference) !== 0
  );
}

/**
 * Checks if a node has a generic type like:
 *
 * function foo<T> (bar: T) {
 *    bar // is generic
 * }
 *
 * @param node TSESTree.Node
 * @param services RuleContext.parserServices
 * @returns
 */
export function isGenericType(node: TSESTree.Node, services: RequiredParserServices) {
  const type = getTypeFromTreeNode(node as estree.Node, services);
  return type.isTypeParameter();
}

/**
 * Returns the TypeScript type resolved at `node`.
 */
export function getTypeFromTreeNode(node: estree.Node, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  return checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node));
}

/**
 * Returns the widened string representation of the type resolved at `node`.
 */
export function getTypeAsString(node: estree.Node, services: RequiredParserServices) {
  const { typeToString, getBaseTypeOfLiteralType } = services.program.getTypeChecker();
  return typeToString(getBaseTypeOfLiteralType(getTypeFromTreeNode(node, services)));
}

/**
 * Returns the symbol resolved at `node`, if any.
 */
export function getSymbolAtLocation(node: estree.Node, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  return checker.getSymbolAtLocation(services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node));
}

/**
 * Returns the resolved call signature for the call-like expression at `node`.
 */
export function getSignatureFromCallee(node: estree.Node, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  return checker.getResolvedSignature(
    services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node) as ts.CallLikeExpression,
  );
}

/**
 * This function checks if a type may correspond to an array type. Beyond simple array types, it will also
 * consider the union of array types and generic types extending an array type.
 * @param type A type to check
 * @param services The services used to get access to the TypeScript type checker
 */
export function isArrayLikeType(type: ts.Type, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  const constrained = checker.getBaseConstraintOfType(type);
  return isArrayOrUnionOfArrayType(constrained ?? type, services);
}

function isArrayOrUnionOfArrayType(type: ts.Type, services: RequiredParserServices): boolean {
  for (const part of getUnionTypes(type)) {
    if (!isArrayType(part, services)) {
      return false;
    }
  }

  return true;
}

/**
 * Test if the provided type is an array of strings.
 * @param type A TypeScript type.
 * @param services The services used to get access to the TypeScript type checker
 */
export function isStringArray(type: ts.Type, services: RequiredParserServices) {
  return isArrayElementTypeMatching(type, services, isStringType);
}

/**
 * Test if the provided type is an array of numbers.
 * @param type A TypeScript type.
 * @param services The services used to get access to the TypeScript type checker
 */
export function isNumberArray(type: ts.Type, services: RequiredParserServices) {
  return isArrayElementTypeMatching(type, services, isNumberType);
}

/**
 * Test if the provided type is an array of big integers.
 * @param type A TypeScript type.
 * @param services The services used to get access to the TypeScript type checker
 */
export function isBigIntArray(type: ts.Type, services: RequiredParserServices) {
  return isArrayElementTypeMatching(type, services, isBigIntType);
}

/**
 * Test if the provided type is an array of booleans.
 * @param type A TypeScript type.
 * @param services The services used to get access to the TypeScript type checker
 */
export function isBooleanArray(type: ts.Type, services: RequiredParserServices) {
  return isArrayElementTypeMatching(type, services, isBooleanType);
}

function isArrayElementTypeMatching(
  type: ts.Type,
  services: RequiredParserServices,
  predicate: (type: ts.Type) => boolean,
) {
  const checker = services.program.getTypeChecker();
  if (!isArrayType(type, services)) {
    return false;
  }
  const [elementType] = checker.getTypeArguments(type);
  return elementType && predicate(elementType);
}

// Internal TS API
function isArrayType(type: ts.Type, services: RequiredParserServices): type is ts.TypeReference {
  const checker = services.program.getTypeChecker();
  return (
    'isArrayType' in checker &&
    typeof checker.isArrayType === 'function' &&
    checker.isArrayType(type)
  );
}

/**
 * Checks whether a TypeScript type node denotes a type alias.
 * @param node a type node to check
 * @param context the rule context
 */
export function isTypeAlias(node: TSESTree.TypeNode, context: Rule.RuleContext) {
  if (
    node.type !== 'TSTypeReference' ||
    node.typeName.type !== 'Identifier' ||
    node.typeArguments
  ) {
    return false;
  }
  const scope = context.sourceCode.getScope(node as unknown as estree.Node);
  const variable = getVariableFromScope(scope, node.typeName.name);
  return variable?.defs.some(def => def.node.type === 'TSTypeAliasDeclaration');
}

function isBooleanLiteralType(type: ts.Type): type is ts.Type & {
  intrinsicName: 'true' | 'false';
} {
  return type.flags === ts.TypeFlags.BooleanLiteral;
}

/**
 * Returns true when `type` is the boolean literal `true`.
 */
export function isBooleanTrueType(type: ts.Type) {
  return isBooleanLiteralType(type) && type.intrinsicName === 'true';
}

/**
 * Returns true when `type` is boolean-like.
 */
export function isBooleanType({ flags }: ts.Type) {
  return (flags & ts.TypeFlags.BooleanLike) !== 0;
}

/**
 * Returns true when `type` is `null`, `undefined`, or a union containing either.
 */
export function isNullOrUndefinedType({ flags }: ts.Type) {
  return flags & ts.TypeFlags.Null || flags & ts.TypeFlags.Undefined;
}

/**
 * Returns true when `type` is object-like.
 */
export function isObjectType({ flags }: ts.Type) {
  return flags & ts.TypeFlags.Object;
}

/**
 * Returns true when `node` exposes a callable member named `methodName`.
 */
export function typeHasMethod(
  node: estree.Node,
  methodName: string,
  services: RequiredParserServices,
): boolean {
  const type = getTypeFromTreeNode(node, services);
  const property = type.getProperty(methodName);

  if (!property) {
    return false;
  }

  // Check if it's a method by examining the symbol flags
  if (property.flags & ts.SymbolFlags.Method) {
    return true;
  }

  // Also check if it's a property that contains a function
  if (property.flags & ts.SymbolFlags.Property) {
    const typeChecker = services.program.getTypeChecker();
    const propertyType = property.valueDeclaration
      ? typeChecker.getTypeOfSymbolAtLocation(property, property.valueDeclaration)
      : typeChecker.getTypeOfSymbol(property);

    // Check if the property type is callable (has call signatures)
    return propertyType.getCallSignatures().length > 0;
  }
  return false;
}

/**
 * Checks if a type is iterable (can be used in for-of loops).
 * @param node The node to check
 * @param services The parser services
 * @returns true if the type is iterable, false otherwise
 */
export function isIterable(node: estree.Node, services: RequiredParserServices): boolean {
  const type = getTypeFromTreeNode(node, services);
  const properties = type.getProperties();
  return properties.some(prop => prop.name.startsWith('__@iterator@'));
}

/**
 * Gets the number of parameters for a function-typed node using TypeScript type information.
 * Returns null if the parameter count cannot be determined.
 *
 * For functions with multiple call signatures (overloads), returns the maximum
 * parameter count across all signatures.
 *
 * @param node The node to get parameter count for
 * @param services TypeScript parser services
 * @returns The parameter count, or null if it cannot be determined
 */
export function getFunctionParameterCount(
  node: estree.Node,
  services: RequiredParserServices,
): number | null {
  try {
    const type = getTypeFromTreeNode(node, services);
    const signatures = type.getCallSignatures();

    if (signatures.length === 0) {
      return null;
    }

    // Return the maximum parameter count across all signatures
    // (handles function overloads)
    return Math.max(...signatures.map(sig => sig.parameters.length));
  } catch {
    return null;
  }
}
