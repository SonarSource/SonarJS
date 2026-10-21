// Adapted from typescript-eslint native adapters; see NOTICE.md and LICENSE.
import { symbolName, getJSDocTags, getTextOfJSDocComment } from './api.mjs';
import { CheckFlags, ElementFlags, ObjectFlags, SymbolFlags, TypeFlags } from './api.mjs';
import { CompilerContractError } from '../../errors.cjs';
import { compilerCall, compilerMethods } from './contract.mjs';
import ts from './utilities.mjs';
import { getModifiers } from './modifiers.mjs';
import { createFlagTranslations, translateFlags } from './translateFlags.mjs';
const OBJECT_FLAG_TRANSLATIONS = createFlagTranslations(ObjectFlags, ts.ObjectFlags);
const CHECK_FLAG_TRANSLATIONS = createFlagTranslations(CheckFlags, ts.CheckFlags);
function toPseudoBigInt(value) {
  return {
    base10Value: (value < 0n ? -value : value).toString(),
    negative: value < 0n,
  };
}
function createWrapper(classicProperties, classicMethods, presenceChecks) {
  const CACHE = Symbol('cache');
  const NATIVE = Symbol('native');
  const VIEW = Symbol('view');
  const forwarders = new WeakMap();
  const prototypes = new WeakMap();
  function unwrap(classic) {
    const native = classic[NATIVE];
    if (!native) {
      throw new CompilerContractError(
        'The value was not created by this native type adapter. Native and classic type objects cannot be mixed.',
      );
    }
    return native;
  }
  function forward(method) {
    let forwarder = forwarders.get(method);
    if (!forwarder) {
      forwarder = function (...args) {
        return compilerCall('Type method', () => method.apply(unwrap(this), args));
      };
      forwarders.set(method, forwarder);
    }
    return forwarder;
  }
  function createPrototype(native) {
    const prototype = {};
    for (
      let current = native;
      current && current !== Object.prototype;
      current = Object.getPrototypeOf(current)
    ) {
      for (const name of Object.getOwnPropertyNames(current)) {
        if (
          name !== 'constructor' &&
          !Object.hasOwn(prototype, name) &&
          !Object.hasOwn(classicProperties, name) &&
          !Object.hasOwn(classicMethods, name)
        ) {
          Object.defineProperty(prototype, name, {
            get() {
              const value = this[NATIVE][name];
              return typeof value === 'function' ? forward(value) : value;
            },
          });
        }
      }
    }
    for (const name of Object.keys(classicProperties)) {
      if (!Object.hasOwn(presenceChecks, name)) {
        Object.defineProperty(prototype, name, readClassicProperty(name));
      }
    }
    return Object.assign(
      prototype,
      compilerMethods({ ...classicMethods }, 'Type/Symbol/Signature'),
    );
  }
  function readClassicProperty(name) {
    const read = classicProperties[name];
    return {
      enumerable: true,
      get() {
        const cache = this[CACHE];
        const cached = cache.get(name);
        if (cached != null || cache.has(name)) {
          return cached;
        }
        const value = compilerCall(`Type/Symbol/Signature.${name}`, () => read(this[NATIVE]));
        cache.set(name, value);
        return value;
      },
    };
  }
  function wrap(native) {
    if (!native) {
      return void 0;
    }
    const cached = native[VIEW];
    if (cached) {
      return cached;
    }
    const nativePrototype = Object.getPrototypeOf(native);
    let prototype = prototypes.get(nativePrototype);
    if (!prototype) {
      prototype = createPrototype(native);
      prototypes.set(nativePrototype, prototype);
    }
    const view = Object.create(prototype);
    view[CACHE] = new Map();
    view[NATIVE] = native;
    const classic = view;
    native[VIEW] = classic;
    for (const [name, isPresent] of Object.entries(presenceChecks)) {
      if (isPresent(native)) {
        Object.defineProperty(view, name, readClassicProperty(name));
      }
    }
    return classic;
  }
  return { unwrap, wrap };
}
function createNativeTypeAdapter({ checker, nodeAdapter }) {
  const toSignature = signature => wrapSignature(signature);
  const toSymbol = symbol => wrapSymbol(symbol);
  const toType = type => wrapType(type);
  function resolveDeclaration(handle) {
    const resolved = handle;
    return resolved && nodeAdapter.wrapNode(resolved);
  }
  function wrapTypeList(types) {
    return types.length ? types.map(toType) : void 0;
  }
  function toJSDocTagInfo(name, text) {
    return { name, text: text ? [{ kind: 'text', text }] : void 0 };
  }
  const propertiesByName = new WeakMap();
  const listedPropertiesByName = new WeakMap();
  function listPropertiesByName(type) {
    const listed = new Map(
      checker
        .getPropertiesOfType(unwrapType(type))
        .map(property => [property.name, wrapSymbol(property)]),
    );
    listedPropertiesByName.set(type, listed);
    return listed;
  }
  const typeMethods = {
    getApparentProperties() {
      return checker.getPropertiesOfType(checker.getApparentType(unwrapType(this))).map(toSymbol);
    },
    getBaseTypes() {
      return unwrapType(this).getBaseTypes()?.map(toType);
    },
    getCallSignatures() {
      return checker.getSignaturesOfType(unwrapType(this), 0).map(toSignature);
    },
    getConstraint() {
      return wrapType(checker.getBaseConstraintOfType(unwrapType(this)));
    },
    getConstructSignatures() {
      return checker.getSignaturesOfType(unwrapType(this), 1).map(toSignature);
    },
    getDefault() {
      return this.default;
    },
    getFlags() {
      return this.flags;
    },
    getNonNullableType() {
      return wrapType(checker.getNonNullableType(unwrapType(this)));
    },
    getNumberIndexType() {
      return wrapType(checker.getIndexTypeOfType(unwrapType(this), 1));
    },
    getProperties() {
      return checker.getPropertiesOfType(unwrapType(this)).map(toSymbol);
    },
    getProperty(name) {
      let properties = propertiesByName.get(this);
      if (!properties) {
        properties = new Map();
        propertiesByName.set(this, properties);
      }
      if (properties.has(name)) {
        return properties.get(name);
      }
      const listed =
        listedPropertiesByName.get(this) ??
        (properties.size >= 2 ? listPropertiesByName(this) : void 0);
      const property =
        listed?.get(name) ?? wrapSymbol(checker.getPropertyOfType(unwrapType(this), name));
      properties.set(name, property);
      return property;
    },
    getStringIndexType() {
      return wrapType(checker.getIndexTypeOfType(unwrapType(this), 0));
    },
    getSymbol() {
      return this.symbol;
    },
    isClass() {
      const type = unwrapType(this);
      return type.isObjectType() && (type.objectFlags & ObjectFlags.Class) !== 0;
    },
    isIntersection() {
      return unwrapType(this).isIntersectionType();
    },
    // Native `isLiteralType()` also covers boolean literals.
    isLiteral() {
      const type = unwrapType(this);
      return type.isLiteralType() && !type.isBooleanLiteralType();
    },
    isNumberLiteral() {
      return unwrapType(this).isNumberLiteralType();
    },
    isStringLiteral() {
      return unwrapType(this).isStringLiteralType();
    },
    isUnion() {
      return unwrapType(this).isUnionType();
    },
    isUnionOrIntersection() {
      const type = unwrapType(this);
      return type.isUnionType() || type.isIntersectionType();
    },
  };
  function getInheritedJsDocTags(declaration) {
    const container = ts.isConstructorDeclaration(declaration.parent)
      ? declaration.parent.parent
      : declaration.parent;
    const name = ts.getNameOfDeclaration(declaration);
    if (
      !name ||
      !('text' in name) ||
      !(ts.isClassLike(container) || ts.isInterfaceDeclaration(container))
    ) {
      return void 0;
    }
    const isStatic = getModifiers(declaration)?.some(
      modifier => modifier.kind === ts.SyntaxKind.StaticKeyword,
    );
    for (const clause of container.heritageClauses ?? []) {
      for (const superTypeNode of clause.types) {
        const baseType = checker.getTypeAtLocation(nodeAdapter.unwrapNode(superTypeNode));
        const baseSymbol = baseType.getSymbol();
        const symbol = checker.getPropertyOfType(
          isStatic && baseSymbol ? checker.getTypeOfSymbol(baseSymbol) : baseType,
          name.text,
        );
        if (symbol?.declarations.length === 1) {
          return wrapSymbol(symbol).getJsDocTags();
        }
      }
    }
    return void 0;
  }
  const jsDocTagsBySymbol = new WeakMap();
  const symbolMethods = {
    getDeclarations() {
      return this.declarations;
    },
    getDocumentationComment() {
      const comment = checker.getDocumentationComment(unwrapSymbol(this));
      return comment ? [{ kind: 'text', text: comment }] : [];
    },
    getEscapedName() {
      return this.escapedName;
    },
    getFlags() {
      return this.flags;
    },
    getJsDocTags() {
      let tags = jsDocTagsBySymbol.get(this);
      if (!tags) {
        tags = unwrapSymbol(this)
          .getJsDocTags(checker)
          .map(tag => toJSDocTagInfo(tag.name, tag.text));
        jsDocTagsBySymbol.set(this, tags);
      }
      return tags;
    },
    getName() {
      return this.name;
    },
  };
  const signatureMethods = {
    getDeclaration() {
      return this.declaration;
    },
    // Native has no signature documentation to read.
    getDocumentationComment() {
      return [];
    },
    // A signature carries no symbol, and a symbol lookup would merge overloads.
    getJsDocTags() {
      const declaration = unwrapSignature(this).declaration;
      if (!declaration) {
        return [];
      }
      const tags = getJSDocTags(declaration).map(tag =>
        toJSDocTagInfo(tag.tagName.text, getTextOfJSDocComment(tag.comment)),
      );
      return tags.length &&
        !tags.some(tag => tag.name === 'inheritDoc' || tag.name === 'inheritdoc')
        ? tags
        : [...(getInheritedJsDocTags(nodeAdapter.wrapNode(declaration)) ?? []), ...tags];
    },
    getParameters() {
      return this.parameters;
    },
    getReturnType() {
      return this.resolvedReturnType;
    },
    getTypeParameterAtPosition(position) {
      return wrapType(unwrapSignature(this).getTypeParameterAtPosition(position));
    },
    getTypeParameters() {
      return this.typeParameters;
    },
  };
  const classicTypeProperties = {
    aliasSymbol: type => wrapSymbol(type.getAliasSymbol()),
    aliasTypeArguments: type => wrapTypeList(type.getAliasTypeArguments()),
    baseType: type => (type.isSubstitutionType() ? wrapType(type.getBaseType()) : void 0),
    checkType: type => (type.isConditionalType() ? wrapType(type.getCheckType()) : void 0),
    combinedFlags: type =>
      (type.objectFlags & ObjectFlags.Tuple) !== 0
        ? type.elementFlags.reduce((combined, flags) => combined | flags, 0)
        : void 0,
    constraint: type =>
      type.isTypeParameter() || type.isSubstitutionType() ? wrapType(type.getConstraint()) : void 0,
    constraintType: type =>
      (type.objectFlags & ObjectFlags.Mapped) !== 0 ? wrapType(type.getConstraintType()) : void 0,
    default: type => (type.isTypeParameter() ? wrapType(type.getDefault()) : void 0),
    // `UniqueESSymbolType` spells its name the way the checker does for the
    // symbol's own property, which native only exposes piecewise.
    type: type =>
      type.isIndexType() || type.isStringMappingType() ? wrapType(type.getTarget()) : void 0,
    escapedName: type => {
      const symbol = type.flags & TypeFlags.UniqueESSymbol ? type.getSymbol() : void 0;
      return symbol && `__@${symbol.name}@${symbol.id}`;
    },
    extendsType: type => (type.isConditionalType() ? wrapType(type.getExtendsType()) : void 0),
    freshType: type => (type.flags & TypeFlags.Freshable ? wrapType(type.getFreshType()) : void 0),
    indexType: type => (type.isIndexedAccessType() ? wrapType(type.getIndexType()) : void 0),
    intrinsicName: type =>
      type.isBooleanLiteralType()
        ? String(type.value)
        : type.isIntrinsicType()
          ? type.intrinsicName
          : void 0,
    localTypeParameters: type =>
      type.isClassOrInterface() ? wrapTypeList(type.getLocalTypeParameters()) : void 0,
    minLength: type =>
      (type.objectFlags & ObjectFlags.Tuple) !== 0
        ? type.elementFlags.filter(flags => flags & (ElementFlags.Required | ElementFlags.Variadic))
            .length
        : void 0,
    nameType: type =>
      (type.objectFlags & ObjectFlags.Mapped) !== 0 ? wrapType(type.getNameType()) : void 0,
    objectFlags: type => translateFlags(OBJECT_FLAG_TRANSLATIONS, type.objectFlags ?? 0),
    modifiersType: type =>
      ((type.objectFlags ?? 0) & ObjectFlags.Mapped) !== 0
        ? wrapType(checker.getModifiersTypeFromMappedType(type))
        : void 0,
    objectType: type => (type.isIndexedAccessType() ? wrapType(type.getObjectType()) : void 0),
    outerTypeParameters: type =>
      type.isClassOrInterface() ? wrapTypeList(type.getOuterTypeParameters()) : void 0,
    regularType: type =>
      type.flags & TypeFlags.Freshable ? wrapType(type.getRegularType()) : void 0,
    resolvedFalseType: type => (type.isConditionalType() ? wrapType(type.getFalseType()) : void 0),
    resolvedTrueType: type => (type.isConditionalType() ? wrapType(type.getTrueType()) : void 0),
    symbol: type => wrapSymbol(type.getSymbol()),
    target: type => (type.isTypeReference() ? wrapType(type.getTarget()) : void 0),
    templateType: type =>
      (type.objectFlags & ObjectFlags.Mapped) !== 0 ? wrapType(type.getTemplateType()) : void 0,
    thisType: type => (type.isClassOrInterface() ? wrapType(type.thisType) : void 0),
    typeArguments: type =>
      type.isTypeReference() ? checker.getTypeArguments(type).map(toType) : void 0,
    typeParameter: type =>
      (type.objectFlags & ObjectFlags.Mapped) !== 0 ? wrapType(type.getTypeParameter()) : void 0,
    typeParameters: type =>
      type.isClassOrInterface() ? wrapTypeList(type.getTypeParameters()) : void 0,
    types: type =>
      type.isUnionType() || type.isIntersectionType() || type.isTemplateLiteralType()
        ? type.getTypes().map(toType)
        : void 0,
    value: type =>
      type.isBigIntLiteralType()
        ? toPseudoBigInt(type.value)
        : type.isLiteralType()
          ? type.value
          : void 0,
  };
  const classicSymbolProperties = {
    name: symbol => symbolName(symbol),
    // Native already escapes internal names and user names separately. Escaping
    // symbolName again turns __@asyncIterator into ___@asyncIterator and breaks
    // well-known-symbol lookup in ts-api-utils.
    escapedName: symbol => symbol.escapedName,
    // Classic leaves a synthesized alias, such as a CommonJS module's
    // `default`, without declarations.
    declarations: symbol => {
      const { declarations } = symbol;
      return declarations.length === 0 && symbol.flags & SymbolFlags.Alias
        ? void 0
        : declarations.map(resolveDeclaration).filter(declaration => declaration != null);
    },
    exports: symbol => wrapSymbolTable(symbol.getExports()),
    // Classic keeps a transient symbol's check flags and type in its links.
    links: symbol => {
      if (!(symbol.flags & SymbolFlags.Transient)) {
        return void 0;
      }
      let type;
      return {
        get type() {
          return (type ??= wrapType(checker.getTypeOfSymbol(symbol)));
        },
        checkFlags: translateFlags(CHECK_FLAG_TRANSLATIONS, symbol.checkFlags),
      };
    },
    members: symbol => wrapSymbolTable(symbol.getMembers()),
    parent: symbol => wrapSymbol(symbol.getParent()),
    valueDeclaration: symbol => resolveDeclaration(symbol.valueDeclaration),
  };
  const classicSignatureProperties = {
    declaration: signature => resolveDeclaration(signature.declaration),
    parameters: signature => signature.getParameters().map(toSymbol),
    resolvedReturnType: signature => wrapType(checker.getReturnTypeOfSignature(signature)),
    target: signature => wrapSignature(signature.getTarget()),
    thisParameter: signature => wrapSymbol(signature.getThisParameter()),
    typeParameters: signature => wrapTypeList(signature.getTypeParameters()),
  };
  const { unwrap: unwrapType, wrap: wrapType } = createWrapper(classicTypeProperties, typeMethods, {
    type: type => type.isIndexType() || type.isStringMappingType(),
    typeParameter: type => (type.objectFlags & ObjectFlags.Mapped) !== 0,
    value: type => type.isLiteralType(),
  });
  const { unwrap: unwrapSymbol, wrap: wrapSymbol } = createWrapper(
    classicSymbolProperties,
    { ...symbolMethods },
    {
      links: symbol => (symbol.flags & SymbolFlags.Transient) !== 0,
    },
  );
  const { unwrap: unwrapSignature, wrap: wrapSignature } = createWrapper(
    classicSignatureProperties,
    signatureMethods,
    {},
  );
  function wrapSymbolTable(table) {
    const wrappedTable = new Map();
    for (const [name, member] of table) {
      wrappedTable.set(name, wrapSymbol(member));
    }
    return wrappedTable;
  }
  function wrapIndexInfo(info) {
    return {
      type: wrapType(info.valueType),
      declaration: resolveDeclaration(info.declaration),
      isReadonly: info.isReadonly,
      keyType: wrapType(info.keyType),
    };
  }
  function wrapTypePredicate(predicate) {
    return (
      predicate && {
        ...predicate,
        type: wrapType(predicate.type),
      }
    );
  }
  return {
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
  };
}
export { createNativeTypeAdapter };
