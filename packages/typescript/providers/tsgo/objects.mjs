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
import ts from '../../compat/index.cjs';
import { CompilerContractError } from '../../errors.cjs';

// Native objects never escape this program-local adapter. All identities and
// memoized queries belong to one snapshot, including declaration NodeHandles.
export function createObjects({ native, sdk, checker: remote, call, diagnostics }) {
  const views = new WeakMap();
  const originals = new WeakMap();
  const enumMap = (source, target) => {
    const values = new Map();
    for (const [name, value] of Object.entries(source)) {
      if (typeof value === 'number' && typeof target[name] === 'number')
        values.set(value, target[name]);
    }
    return value => values.get(value) ?? value;
  };
  const kind = enumMap(native.SyntaxKind, ts.SyntaxKind);
  const nativeKind = enumMap(ts.SyntaxKind, native.SyntaxKind);
  const flags = (source, target) => {
    const entries = Object.entries(source).filter(
      ([name, value]) =>
        typeof value === 'number' &&
        value > 0 &&
        (value & (value - 1)) === 0 &&
        typeof target[name] === 'number',
    );
    return value =>
      entries.reduce((result, [name, bit]) => (value & bit ? result | target[name] : result), 0);
  };
  const nodeFlags = flags(native.NodeFlags, ts.NodeFlags);
  const objectFlags = flags(sdk.ObjectFlags, ts.ObjectFlags);
  const checkFlags = flags(sdk.CheckFlags, ts.CheckFlags);
  const unwrap = value => {
    if (value == null || typeof value !== 'object') return value;
    if (originals.has(value)) return originals.get(value);
    if (Array.isArray(value)) return value.map(unwrap);
    throw new CompilerContractError('TSGo objects from different programs cannot be mixed');
  };
  const resolve = handle => handle && wrap(call(() => handle.resolve()));
  const isNode = value =>
    typeof value?.kind === 'number' && typeof value.forEachChild === 'function';
  const isType = value => typeof value?.isUnionType === 'function';
  const isHeritage = node =>
    node.kind === native.SyntaxKind.TypeReference &&
    node.parent?.kind === native.SyntaxKind.HeritageClause;
  const isHeritageName = node => {
    if (node.kind !== native.SyntaxKind.QualifiedName) return false;
    while (node.parent?.kind === native.SyntaxKind.QualifiedName) node = node.parent;
    return isHeritage(node.parent ?? {});
  };
  const isJSDocDeclaration = node =>
    node.kind === native.SyntaxKind.JSTypeAliasDeclaration ||
    node.kind === native.SyntaxKind.JSImportDeclaration;
  const isSyntaxChild = (parent, node) =>
    !isJSDocDeclaration(node) &&
    !(
      (node === parent.type ||
        parent.typeParameters?.includes(node) ||
        parent.parameters?.includes(node)) &&
      node.end <= parent.getStart()
    );
  const copyArrayProperties = (source, target) => {
    for (const key of ['pos', 'end', 'hasTrailingComma', 'transformFlags'])
      if (source[key] !== undefined) target[key] = source[key];
    return target;
  };
  const syntaxChildren = (parent, nodes) => {
    const result = wrap(nodes);
    return nodes?.some(node => !isSyntaxChild(parent, node))
      ? copyArrayProperties(
          nodes,
          result.filter((_node, index) => isSyntaxChild(parent, nodes[index])),
        )
      : result;
  };
  function wrap(value) {
    if (value == null || typeof value !== 'object') return value;
    if (views.has(value)) return views.get(value);
    if (Array.isArray(value)) {
      const result = [];
      views.set(value, result);
      for (const item of value) result.push(wrap(item));
      return copyArrayProperties(value, result);
    }
    if (value instanceof Map) {
      const result = new Map();
      views.set(value, result);
      for (const [key, entry] of value) result.set(key, wrap(entry));
      return result;
    }
    const category = isNode(value)
      ? 'node'
      : isType(value)
        ? 'type'
        : value instanceof sdk.Symbol
          ? 'symbol'
          : value instanceof sdk.Signature
            ? 'signature'
            : undefined;
    if (!category)
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key === 'valueType' ? 'type' : key,
          item instanceof sdk.NodeHandle ? resolve(item) : wrap(item),
        ]),
      );
    const cache = new Map();
    const view = new Proxy(Object.create(null), {
      get(_target, property) {
        if (cache.has(property)) return cache.get(property);
        const result = read(value, category, property, view);
        cache.set(property, result);
        return result;
      },
      set(_target, property, result) {
        cache.set(property, result);
        return true;
      },
      has(_target, property) {
        return cache.has(property) || property in value;
      },
    });
    views.set(value, view);
    originals.set(view, value);
    return view;
  }
  const typeProperties = {
    symbol: 'getSymbol',
    target: 'getTarget',
    aliasSymbol: 'getAliasSymbol',
    aliasTypeArguments: 'getAliasTypeArguments',
    typeArguments: undefined,
    types: 'getTypes',
    typeParameters: 'getTypeParameters',
    outerTypeParameters: 'getOuterTypeParameters',
    localTypeParameters: 'getLocalTypeParameters',
    thisType: 'getThisType',
    constraint: 'getConstraint',
    default: 'getDefault',
    freshType: 'getFreshType',
    regularType: 'getRegularType',
    objectType: 'getObjectType',
    indexType: 'getIndexType',
    checkType: 'getCheckType',
    extendsType: 'getExtendsType',
    resolvedTrueType: 'getTrueType',
    resolvedFalseType: 'getFalseType',
    baseType: 'getBaseType',
    typeParameter: 'getTypeParameter',
    constraintType: 'getConstraintType',
    nameType: 'getNameType',
    templateType: 'getTemplateType',
  };
  function read(raw, category, property, view) {
    if (typeof property === 'symbol' || property === 'then' || property === '__esModule')
      return undefined;
    if (category === 'node') {
      if (property === 'kind')
        return isHeritage(raw)
          ? ts.SyntaxKind.ExpressionWithTypeArguments
          : isHeritageName(raw)
            ? ts.SyntaxKind.PropertyAccessExpression
            : kind(raw.kind);
      if (property === 'flags') {
        let result = nodeFlags(raw.flags);
        if (raw.kind === native.SyntaxKind.ModuleDeclaration) {
          if (raw.keyword === native.SyntaxKind.NamespaceKeyword) result |= ts.NodeFlags.Namespace;
          if (raw.name?.text === 'global' && raw.name.kind === native.SyntaxKind.Identifier)
            result |= ts.NodeFlags.GlobalAugmentation;
        }
        return result;
      }
      // TSGo exposes JSDoc @template parameters on JavaScript functions. They
      // participate in checking, but are not a syntactic <...> declaration.
      if (
        property === 'typeParameters' &&
        raw.typeParameters?.length &&
        raw.typeParameters.every(parameter => parameter.end <= raw.getStart())
      )
        return undefined;
      // JSDoc parameter/return types participate in native checking but must not
      // become TypeScript annotations in the JavaScript syntax tree.
      if (property === 'type' && raw.type && raw.type.end <= raw.getStart()) return undefined;
      // Native JSDoc typedef/import declarations are checker inputs, not JS statements.
      if (property === 'statements') return syntaxChildren(raw, raw.statements);
      // @this supplies a native checker parameter located inside the comment.
      if (property === 'parameters') return syntaxChildren(raw, raw.parameters);
      if (property === 'parseDiagnostics')
        return raw.kind === native.SyntaxKind.SourceFile ? diagnostics(raw) : undefined;
      if (property === 'escapedText')
        return raw.text === undefined ? undefined : ts.escapeLeadingUnderscores(raw.text);
      if (property === 'modifierFlagsCache')
        return native.getCombinedModifierFlags(raw) | ts.ModifierFlags.HasComputedFlags;
      if (property === 'default') return wrap(raw.defaultType);
      if (property === 'elements' && raw.kind === native.SyntaxKind.ImportAttributes)
        return wrap(raw.attributes);
      if (property === 'expression' && isHeritage(raw)) return wrap(raw.typeName);
      if (property === 'expression' && isHeritageName(raw)) return wrap(raw.left);
      if (property === 'name' && isHeritageName(raw)) return wrap(raw.right);
      if ((property === 'questionToken' || property === 'exclamationToken') && raw.postfixToken)
        return raw.postfixToken.kind ===
          native.SyntaxKind[property === 'questionToken' ? 'QuestionToken' : 'ExclamationToken']
          ? wrap(raw.postfixToken)
          : undefined;
      if (property === 'forEachChild')
        return (visitor, visitArray) =>
          raw.forEachChild(
            node => (isSyntaxChild(raw, node) ? visitor(wrap(node)) : undefined),
            visitArray &&
              (nodes => {
                const children = syntaxChildren(raw, nodes);
                return children.length ? visitArray(children) : undefined;
              }),
          );
      if (['operator', 'keywordToken', 'phaseModifier', 'token'].includes(property))
        return typeof raw[property] === 'number' ? kind(raw[property]) : wrap(raw[property]);
    }
    if (category === 'type') {
      if (property === 'intrinsicName' && raw.isBooleanLiteralType()) return String(raw.value);
      if (property === 'declaredIndexInfos')
        return wrap(call(() => remote.getIndexInfosOfType(raw)));
      if (property === 'objectFlags') return objectFlags(raw.objectFlags);
      if (property === 'value')
        return typeof raw.value === 'bigint'
          ? {
              negative: raw.value < 0n,
              base10Value: (raw.value < 0n ? -raw.value : raw.value).toString(),
            }
          : raw.value;
      if (property === 'typeArguments')
        return raw.isTypeReference() ? wrap(call(() => remote.getTypeArguments(raw))) : undefined;
      if (property === 'type')
        return raw.isIndexType() || raw.isStringMappingType()
          ? wrap(call(() => raw.getTarget()))
          : undefined;
      if (property === 'minLength')
        return raw.elementFlags?.filter(
          flag => flag & (sdk.ElementFlags.Required | sdk.ElementFlags.Variadic),
        ).length;
      if (property === 'isClass') return () => !!(raw.objectFlags & sdk.ObjectFlags.Class);
      const predicates = {
        isUnion: 'isUnionType',
        isIntersection: 'isIntersectionType',
        isStringLiteral: 'isStringLiteralType',
        isNumberLiteral: 'isNumberLiteralType',
      };
      if (property in predicates) return () => raw[predicates[property]]();
      if (property === 'isLiteral') return () => raw.isLiteralType() && !raw.isBooleanLiteralType();
      if (property === 'isUnionOrIntersection')
        return () => raw.isUnionType() || raw.isIntersectionType();
      if (property === 'getFlags') return () => raw.flags;
      if (Object.hasOwn(typeProperties, property))
        return wrap(call(() => raw[typeProperties[property]]()));
    }
    if (category === 'symbol') {
      if (property === 'declarations')
        return raw.declarations.length ? raw.declarations.map(resolve) : undefined;
      if (property === 'valueDeclaration') return resolve(raw.valueDeclaration);
      if (property === 'parent') return wrap(call(() => raw.getParent()));
      if (property === 'members') return wrap(call(() => raw.getMembers()));
      if (property === 'exports') return wrap(call(() => raw.getExports()));
      if (property === 'getFlags') return () => raw.flags;
      if (property === 'getName') return () => raw.name;
      if (property === 'getEscapedName') return () => raw.escapedName;
      if (property === 'getDeclarations') return () => view.declarations;
      if (property === 'links')
        return raw.flags & sdk.SymbolFlags.Transient
          ? {
              checkFlags: checkFlags(raw.checkFlags),
              get type() {
                return wrap(call(() => remote.getTypeOfSymbol(raw)));
              },
            }
          : undefined;
      if (property === 'getJsDocTags') return () => call(() => raw.getJsDocTags(remote));
      if (property === 'getDocumentationComment')
        return () => [{ kind: 'text', text: call(() => raw.getDocumentationComment(remote)) }];
    }
    if (category === 'signature') {
      if (property === 'declaration') return resolve(raw.declaration);
      const properties = {
        parameters: 'getParameters',
        typeParameters: 'getTypeParameters',
        thisParameter: 'getThisParameter',
        target: 'getTarget',
        resolvedReturnType: 'getReturnType',
      };
      if (property in properties) return wrap(call(() => raw[properties[property]]()));
      if (property === 'getDeclaration') return () => view.declaration;
      if (property === 'getDocumentationComment')
        return () => {
          const declaration = raw.declaration && call(() => raw.declaration.resolve());
          const text =
            declaration &&
            native
              .getJSDocCommentsAndTags(declaration)
              .filter(doc => doc.kind === native.SyntaxKind.JSDoc)
              .map(doc => native.getTextOfJSDocComment(doc.comment) ?? '')
              .filter(Boolean)
              .join('\n');
          return text ? [{ kind: 'text', text }] : [];
        };
      if (property === 'getJsDocTags')
        return () => {
          const declaration = raw.declaration && call(() => raw.declaration.resolve());
          return declaration
            ? native.getJSDocTags(declaration).map(tag => ({
                name: tag.tagName.text,
                text: tag.comment
                  ? [{ kind: 'text', text: native.getTextOfJSDocComment(tag.comment) }]
                  : undefined,
              }))
            : [];
        };
    }
    const result = raw[property];
    return typeof result === 'function'
      ? (...args) =>
          wrap(
            category === 'node'
              ? result.apply(raw, args.map(unwrap))
              : call(() => result.apply(raw, args.map(unwrap))),
          )
      : wrap(result);
  }
  function memoize(method) {
    const root = new Map();
    return (...args) => {
      call(() => undefined); // Validate lifetime even when a query is cached.
      let entry = root;
      while (args.length && args.at(-1) === undefined) args.pop();
      for (const argument of args) {
        if (!entry.has(argument)) entry.set(argument, new Map());
        entry = entry.get(argument);
      }
      if (!entry.has(memoize)) entry.set(memoize, method(...args));
      return entry.get(memoize);
    };
  }
  const methods = new Map();
  const checker = new Proxy(Object.create(null), {
    has(_target, property) {
      return (
        typeof remote[property] === 'function' ||
        [
          'getTrueType',
          'getFalseType',
          'getSuggestionDiagnostics',
          'tryGetMemberInModuleExports',
        ].includes(property)
      );
    },
    get(_target, property) {
      if (typeof property === 'symbol' || property === 'then') return undefined;
      if (methods.has(property)) return methods.get(property);
      if (property === 'getTrueType' || property === 'getFalseType')
        return () => {
          const type = call(() => remote.getBooleanType());
          return wrap(
            call(() => type.getTypes()).find(part => part.value === (property === 'getTrueType')),
          );
        };
      if (property === 'getSuggestionDiagnostics')
        return file => diagnostics(unwrap(file), 'getSuggestionDiagnostics');
      if (property === 'tryGetMemberInModuleExports')
        return (name, symbol) =>
          wrap(call(() => remote.getMemberInModuleExports(unwrap(symbol), name)));
      if (typeof remote[property] !== 'function')
        throw new CompilerContractError(`TSGo does not implement TypeChecker.${String(property)}`);
      const method = memoize((...args) => {
        if (property === 'getTypeAtLocation' && args[0] == null)
          return wrap(call(() => remote.getAnyType()));
        if (property === 'resolveName') args = [args[0], args[2], args[1], args[3]];
        if (property === 'signatureToSignatureDeclaration') args[1] = nativeKind(args[1]);
        return wrap(call(() => remote[property](...args.map(unwrap))));
      });
      methods.set(property, method);
      return method;
    },
  });
  return { wrap, unwrap, checker, kind };
}
