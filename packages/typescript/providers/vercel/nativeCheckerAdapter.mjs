// Adapted from typescript-eslint native adapters; see NOTICE.md and LICENSE.
import { SyntaxKind as NativeSyntaxKind } from './api.mjs';
import { compilerCall } from './contract.mjs';
import { SymbolFlags } from './api.mjs';
const tsutils = {
  isObjectType: t => (t.flags & ts.TypeFlags.Object) !== 0,
  isObjectFlagSet: (t, f) => (t.objectFlags & f) !== 0,
  isTypeFlagSet: (t, f) => (t.flags & f) !== 0,
  isSymbolFlagSet: (t, f) => (t.flags & f) !== 0,
};
import ts from './utilities.mjs';
import { throwOnUnsupportedMembers } from './throwOnUnsupportedMembers.mjs';
const UNSUPPORTED_CHECKER_MEMBERS = new Set([
  'getAmbientModules',
  'getAugmentedPropertiesOfType',
  'getBigIntLiteralType',
  'getIndexInfosOfIndexSymbol',
  'getJsxIntrinsicTagNamesAt',
  'getMergedSymbol',
  'getNullableType',
  'getNumberLiteralType',
  'getPrivateIdentifierPropertyOfType',
  'getPropertySymbolOfDestructuringAssignment',
  'getRootSymbols',
  'getStringLiteralType',
  'getSymbolOfExpando',
  'getSymbolsOfParameterPropertyDeclaration',
  'getTypeArgumentsForResolvedSignature',
  'getTypeOfAssignmentPattern',
  'indexInfoToIndexSignatureDeclaration',
  'isImplementationOfOverload',
  'isOptionalParameter',
  'isValidPropertyAccess',
  'runWithCancellationToken',
  'signatureToString',
  'symbolToEntityName',
  'symbolToExpression',
  'symbolToParameterDeclaration',
  'symbolToString',
  'symbolToTypeParameterDeclarations',
  'typeParameterToDeclaration',
  'typePredicateToString',
]);
const CONSTRAINED_FLAGS =
  ts.TypeFlags.InstantiableNonPrimitive |
  ts.TypeFlags.UnionOrIntersection |
  ts.TypeFlags.TemplateLiteral |
  ts.TypeFlags.StringMapping |
  ts.TypeFlags.Index;
const PRIMITIVE_KINDS = [
  ts.TypeFlags.String | ts.TypeFlags.StringLiteral,
  ts.TypeFlags.Number | ts.TypeFlags.NumberLiteral,
  ts.TypeFlags.BigInt | ts.TypeFlags.BigIntLiteral,
  ts.TypeFlags.BooleanLiteral,
  ts.TypeFlags.ESSymbol | ts.TypeFlags.UniqueESSymbol,
  ts.TypeFlags.NonPrimitive,
];
function isTypeOfSymbolLocation(symbol, node) {
  return (
    // An identifier only narrows the symbol it names.
    (ts.isIdentifier(node) &&
      (node.text === symbol.name ||
        ts.isPropertyAccessExpression(node.parent) ||
        ts.isQualifiedName(node.parent))) ||
    node.kind === ts.SyntaxKind.PrivateIdentifier ||
    (!ts.isSourceFile(node) &&
      ((ts.isSetAccessorDeclaration(node.parent) && node.parent.name === node) ||
        (ts.isElementAccessExpression(node.parent) && node.parent.argumentExpression === node)))
  );
}
function createNativeChecker({ checker, nodeAdapter, typeAdapter }) {
  const {
    toSignature,
    toSymbol,
    toType,
    unwrapSignature,
    unwrapSymbol,
    unwrapType,
    wrapIndexInfo,
    wrapSignature,
    wrapSymbol,
    wrapType,
    wrapTypePredicate,
  } = typeAdapter;
  const { unwrapNode } = nodeAdapter;
  const apparentTypesByKind = new Map();
  const arrayTargets = new Map();
  function unwrapLocation(node) {
    const native = unwrapNode(node);
    return (native.kind === NativeSyntaxKind.ImportKeyword ||
      native.kind === NativeSyntaxKind.NewKeyword) &&
      native.parent.kind === NativeSyntaxKind.MetaProperty
      ? native.parent
      : native;
  }
  const typeOfSymbolElsewhereRoot = new MemoEntry();
  const getTypeOfSymbolElsewhere = memoize(
    symbol => wrapType(checker.getNonMissingTypeOfSymbol(symbol)),
    typeOfSymbolElsewhereRoot,
  );
  function getBooleanLiteralType(value) {
    const boolean = checker.getBooleanType();
    const type = boolean.isUnionType()
      ? boolean
          .getTypes()
          .find(constituent => constituent.isBooleanLiteralType() && constituent.value === value)
      : void 0;
    if (!type) {
      throw new Error(`The native boolean type has no ${value} constituent.`);
    }
    return wrapType(type);
  }
  const nativeChecker = {
    getAliasedSymbol: symbol => wrapSymbol(checker.getAliasedSymbol(unwrapSymbol(symbol))),
    getAnyType: () => wrapType(checker.getAnyType()),
    // Plain object types are their own apparent types, and primitives of a kind share one.
    getApparentType: type => {
      if (tsutils.isObjectType(type) && !tsutils.isObjectFlagSet(type, ts.ObjectFlags.Mapped)) {
        return type;
      }
      const kind = PRIMITIVE_KINDS.find(flags => tsutils.isTypeFlagSet(type, flags));
      if (kind == null) {
        return wrapType(checker.getApparentType(unwrapType(type)));
      }
      let apparentType = apparentTypesByKind.get(kind);
      if (!apparentType) {
        apparentType = wrapType(checker.getApparentType(unwrapType(type)));
        apparentTypesByKind.set(kind, apparentType);
      }
      return apparentType;
    },
    getAwaitedType: type => wrapType(checker.getAwaitedType(unwrapType(type))),
    // Only these types and tuples, which may be variadic, have base constraints.
    getBaseConstraintOfType: type =>
      tsutils.isTypeFlagSet(type, CONSTRAINED_FLAGS) || checker.isTupleType(unwrapType(type))
        ? wrapType(checker.getBaseConstraintOfType(unwrapType(type)))
        : void 0,
    getBaseTypeOfLiteralType: type => wrapType(checker.getBaseTypeOfLiteralType(unwrapType(type))),
    getBaseTypes: type => checker.getBaseTypes(unwrapType(type)).map(toType),
    getBigIntType: () => wrapType(checker.getBigIntType()),
    getBooleanType: () => wrapType(checker.getBooleanType()),
    getConstantValue: node => checker.getConstantValue(unwrapNode(node)),
    getContextualType: node => wrapType(checker.getContextualType(unwrapNode(node))),
    getContextualTypeForArgumentAtIndex: (node, index) =>
      wrapType(checker.getContextualTypeForArgumentAtIndex(unwrapNode(node), index)),
    getDeclaredTypeOfSymbol: symbol =>
      wrapType(checker.getDeclaredTypeOfSymbol(unwrapSymbol(symbol))),
    getDefaultFromTypeParameter: type =>
      wrapType(checker.getDefaultFromTypeParameter(unwrapType(type))),
    getESSymbolType: () => wrapType(checker.getESSymbolType()),
    getExportsOfModule: symbol => checker.getExportsOfModule(unwrapSymbol(symbol)).map(toSymbol),
    getExportSpecifierLocalTargetSymbol: node =>
      wrapSymbol(checker.getExportSpecifierLocalTargetSymbol(unwrapNode(node))),
    getExportSymbolOfSymbol: symbol =>
      wrapSymbol(checker.getExportSymbolOfSymbol(unwrapSymbol(symbol))),
    getFalseType: () => getBooleanLiteralType(false),
    getFullyQualifiedName: symbol => checker.getFullyQualifiedName(unwrapSymbol(symbol)),
    getImmediateAliasedSymbol: symbol =>
      wrapSymbol(checker.getImmediateAliasedSymbol(unwrapSymbol(symbol))),
    getIndexInfoOfType: (type, kind) => {
      const info = checker.getIndexInfoOfType(unwrapType(type), kind);
      return info && wrapIndexInfo(info);
    },
    getIndexInfosOfType: type => checker.getIndexInfosOfType(unwrapType(type)).map(wrapIndexInfo),
    getIndexTypeOfType: (type, kind) =>
      wrapType(checker.getIndexTypeOfType(unwrapType(type), kind)),
    getNeverType: () => wrapType(checker.getNeverType()),
    getNonNullableType: type => wrapType(checker.getNonNullableType(unwrapType(type))),
    getNonPrimitiveType: () => wrapType(checker.getNonPrimitiveType()),
    getNullType: () => wrapType(checker.getNullType()),
    getNumberType: () => wrapType(checker.getNumberType()),
    getPropertiesOfType: type => checker.getPropertiesOfType(unwrapType(type)).map(toSymbol),
    getPropertyOfType: (type, name) =>
      wrapSymbol(checker.getPropertyOfType(unwrapType(type), name)),
    getResolvedSignature: node => wrapSignature(checker.getResolvedSignature(unwrapNode(node))),
    getReturnTypeOfSignature: signature =>
      wrapType(checker.getReturnTypeOfSignature(unwrapSignature(signature))),
    getShorthandAssignmentValueSymbol: node =>
      wrapSymbol(node && checker.getShorthandAssignmentValueSymbol(unwrapNode(node))),
    getSignatureFromDeclaration: declaration =>
      wrapSignature(checker.getSignatureFromDeclaration(unwrapNode(declaration))),
    getSignaturesOfType: (type, kind) =>
      checker.getSignaturesOfType(unwrapType(type), kind).map(toSignature),
    getStringType: () => wrapType(checker.getStringType()),
    getSymbolAtLocation: node => wrapSymbol(checker.getSymbolAtLocation(unwrapLocation(node))),
    getSymbolsInScope: (location, meaning) =>
      checker.getSymbolsInScope(unwrapNode(location), meaning).map(toSymbol),
    getTrueType: () => getBooleanLiteralType(true),
    getTypeArguments: type => checker.getTypeArguments(unwrapType(type)).map(toType),
    // Classic answers its error type for a missing node. The native API has no
    // error type to return, so `any` stands in.
    getTypeAtLocation: node => {
      if (node == null) {
        return wrapType(checker.getAnyType());
      }
      const location = unwrapLocation(node);
      return wrapType(checker.getTypeAtLocation(location));
    },
    getTypeFromTypeNode: node => wrapType(checker.getTypeFromTypeNode(unwrapNode(node))),
    getTypeOfPropertyOfType: (type, name) =>
      wrapType(checker.getTypeOfPropertyOfType(unwrapType(type), name)),
    getTypeOfSymbol: symbol => wrapType(checker.getTypeOfSymbol(unwrapSymbol(symbol))),
    // Elsewhere the answer is the symbol's own, so one serves them all.
    getTypeOfSymbolAtLocation: (symbol, node) => {
      const nativeSymbol = unwrapSymbol(symbol);
      return tsutils.isSymbolFlagSet(symbol, ts.SymbolFlags.ExportValue) ||
        isTypeOfSymbolLocation(symbol, node)
        ? wrapType(checker.getTypeOfSymbolAtLocation(nativeSymbol, unwrapNode(node)))
        : getTypeOfSymbolElsewhere(nativeSymbol);
    },
    getTypePredicateOfSignature: signature =>
      wrapTypePredicate(checker.getTypePredicateOfSignature(unwrapSignature(signature))),
    getUndefinedType: () => wrapType(checker.getUndefinedType()),
    getUnknownType: () => wrapType(checker.getUnknownType()),
    getVoidType: () => wrapType(checker.getVoidType()),
    getWidenedType: type => wrapType(checker.getWidenedType(unwrapType(type))),
    isArgumentsSymbol: symbol => checker.isArgumentsSymbol(unwrapSymbol(symbol)),
    isArrayLikeType: type => checker.isArrayLikeType(unwrapType(type)),
    // Whether a reference is to an array depends only on its target.
    isArrayType: type => {
      const native = unwrapType(type);
      const target = native.getTarget();
      if (!native.isTypeReference()) {
        return false;
      }
      if (target == null) {
        return checker.isArrayType(native);
      }
      let isArray = arrayTargets.get(target);
      if (isArray == null) {
        isArray = checker.isArrayType(native);
        arrayTargets.set(target, isArray);
      }
      return isArray;
    },
    isTupleType: type => checker.isTupleType(unwrapType(type)),
    isTypeAssignableTo: (source, target) =>
      checker.isTypeAssignableTo(unwrapType(source), unwrapType(target)),
    isUndefinedSymbol: symbol => checker.isUndefinedSymbol(unwrapSymbol(symbol)),
    isUnknownSymbol: symbol => checker.isUnknownSymbol(unwrapSymbol(symbol)),
    resolveName: (name, location, meaning, excludeGlobals) =>
      wrapSymbol(
        checker.resolveName(name, meaning, location && unwrapNode(location), excludeGlobals),
      ),
    signatureToSignatureDeclaration: (signature, kind, enclosingDeclaration, flags) => {
      const declaration = checker.signatureToSignatureDeclaration(
        unwrapSignature(signature),
        kind,
        enclosingDeclaration && unwrapNode(enclosingDeclaration),
        flags,
      );
      return declaration && nodeAdapter.wrapNode(declaration);
    },
    tryGetMemberInModuleExports: (memberName, moduleSymbol) =>
      wrapSymbol(checker.getMemberInModuleExports(unwrapSymbol(moduleSymbol), memberName)),
    typeToString: (type, enclosingDeclaration, flags) =>
      checker.typeToString(
        unwrapType(type),
        enclosingDeclaration && unwrapNode(enclosingDeclaration),
        flags,
      ),
    typeToTypeNode: (type, enclosingDeclaration, flags) => {
      const typeNode = checker.typeToTypeNode(
        unwrapType(type),
        enclosingDeclaration && unwrapNode(enclosingDeclaration),
        flags,
      );
      return typeNode && nodeAdapter.wrapNode(typeNode);
    },
  };
  const memoized = {};
  for (const [name, method] of Object.entries(nativeChecker)) {
    const root = new MemoEntry();
    memoized[name] = memoize(method, root);
  }
  return {
    checker: throwOnUnsupportedMembers('TypeChecker', UNSUPPORTED_CHECKER_MEMBERS, memoized),
  };
}
class MemoEntry {
  objects = void 0;
  primitives = void 0;
  resolved = false;
  result = void 0;
}
function getMemoEntry(root, args, arity) {
  let length = Math.min(args.length, arity);
  while (length > 0 && args[length - 1] == null) {
    length--;
  }
  let entry = root;
  for (let index = 0; index < length; index++) {
    const arg = args[index];
    let next;
    if (typeof arg === 'object' && arg != null) {
      entry.objects ??= new WeakMap();
      next = entry.objects.get(arg);
      if (!next) {
        next = new MemoEntry();
        entry.objects.set(arg, next);
      }
    } else {
      entry.primitives ??= new Map();
      next = entry.primitives.get(arg);
      if (!next) {
        next = new MemoEntry();
        entry.primitives.set(arg, next);
      }
    }
    entry = next;
  }
  return entry;
}
function memoize(method, root = new MemoEntry()) {
  return (...args) => {
    const entry = getMemoEntry(root, args, method.length);
    if (!entry.resolved) {
      entry.result = compilerCall('TypeChecker query', () => method(...args));
      entry.resolved = true;
    }
    return entry.result;
  };
}
export { createNativeChecker };
