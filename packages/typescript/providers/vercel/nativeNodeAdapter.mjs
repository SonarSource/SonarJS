// Adapted from typescript-eslint native adapters; see NOTICE.md and LICENSE.
import { NodeFlags as NativeNodeFlags, SyntaxKind as NativeSyntaxKind } from './api.mjs';
import { CompilerContractError } from '../../errors.cjs';
import { compilerCall, compilerMethods } from './contract.mjs';
import ts from '../classic.cjs';
import * as api from './api.mjs';
import { createFlagTranslations, translateFlags } from './translateFlags.mjs';
function toClassicDiagnostic(diagnostic, getFile) {
  return {
    category: diagnostic.category,
    code: diagnostic.code,
    file: getFile(diagnostic.fileName),
    length: diagnostic.end - diagnostic.pos,
    messageText: diagnostic.messageChain?.length
      ? toMessageChain(diagnostic)
      : diagnostic.reportsDeprecated
        ? diagnostic.text.replace("The signature 'new (", "The signature '(")
        : diagnostic.text,
    relatedInformation: diagnostic.relatedInformation?.map(related =>
      toClassicDiagnostic(related, getFile),
    ),
    reportsDeprecated: diagnostic.reportsDeprecated,
    reportsUnnecessary: diagnostic.reportsUnnecessary,
    source: diagnostic.source,
    start: diagnostic.pos,
  };
}
function toMessageChain(diagnostic) {
  return {
    category: diagnostic.category,
    code: diagnostic.code,
    messageText: diagnostic.text,
    next: diagnostic.messageChain?.map(toMessageChain),
  };
}
const nativeToClassicKind = new Map();
for (const [name, value] of Object.entries(NativeSyntaxKind)) {
  if (typeof value === 'number') {
    const classic = ts.SyntaxKind[name];
    if (typeof classic === 'number') {
      nativeToClassicKind.set(value, classic);
    }
  }
}
nativeToClassicKind.set(NativeSyntaxKind.EndOfFile, ts.SyntaxKind.EndOfFileToken);
function translateKind(kind) {
  const translated = nativeToClassicKind.get(kind);
  if (translated != null) {
    return translated;
  }
  throw new CompilerContractError(
    `Unsupported native SyntaxKind: ${NativeSyntaxKind[kind]} (${kind})`,
  );
}
const NODE_FLAG_TRANSLATIONS = createFlagTranslations(NativeNodeFlags, ts.NodeFlags);
function getModuleDeclarationFlags(node) {
  const declaration = node;
  if (declaration.keyword === NativeSyntaxKind.NamespaceKeyword) {
    return ts.NodeFlags.Namespace;
  }
  return declaration.name?.kind === NativeSyntaxKind.Identifier &&
    declaration.name.text === 'global' &&
    declaration.keyword !== NativeSyntaxKind.ModuleKeyword
    ? ts.NodeFlags.GlobalAugmentation
    : ts.NodeFlags.None;
}
const translatedNodeFlags = new Map();
function translateNodeFlags(node) {
  let flags = translatedNodeFlags.get(node.flags);
  if (flags == null) {
    flags = translateFlags(NODE_FLAG_TRANSLATIONS, node.flags);
    translatedNodeFlags.set(node.flags, flags);
  }
  return node.kind === NativeSyntaxKind.ModuleDeclaration
    ? flags | getModuleDeclarationFlags(node)
    : flags;
}
const KIND_PROPERTIES = new Set(['keywordToken', 'operator', 'phaseModifier', 'token']);
const NATIVE_NODE = Symbol('nativeNode');
const VALUES = Symbol('values');
const EAGER_KEYS = new Set(['end', 'flags', 'kind', 'pos']);
const CLASSIC_ONLY_KEYS = [
  'default',
  'escapedText',
  'modifierFlagsCache',
  'parent',
  'parseDiagnostics',
];
const FORWARDED_METHODS = [
  'getEnd',
  'getFullStart',
  'getFullWidth',
  'getLineAndCharacterOfPosition',
  'getLineStarts',
  'getPositionOfLineAndCharacter',
];
function getGetterNames(prototype) {
  const getters = new Set();
  for (
    let current = prototype;
    current && current !== Object.prototype;
    current = Object.getPrototypeOf(current)
  ) {
    for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(current))) {
      if (descriptor.get && !NATIVE_ONLY_KEYS.has(name)) {
        getters.add(name);
      }
    }
  }
  return getters;
}
function isReparsed(node) {
  return (node.flags & NativeNodeFlags.Reparsed) !== 0;
}
const NATIVE_ONLY_KEYS = new Set([
  'childMask',
  'data',
  'dataType',
  'defaultType',
  'id',
  'keyword',
  'modifierFlags',
  'next',
  'parentIndex',
  'postfixToken',
  'sourceFile',
]);
function isHeritageTypeReference(node) {
  return (
    node?.kind === NativeSyntaxKind.TypeReference &&
    node.parent?.kind === NativeSyntaxKind.HeritageClause
  );
}
function isHeritageQualifiedName(node) {
  if (node.kind !== NativeSyntaxKind.QualifiedName) {
    return false;
  }
  let typeName = node;
  while (typeName.parent?.kind === NativeSyntaxKind.QualifiedName) {
    typeName = typeName.parent;
  }
  return isHeritageTypeReference(typeName.parent);
}
function translateNodeKind(node) {
  if (isHeritageTypeReference(node)) {
    return ts.SyntaxKind.ExpressionWithTypeArguments;
  }
  return isHeritageQualifiedName(node)
    ? ts.SyntaxKind.PropertyAccessExpression
    : translateKind(node.kind);
}
function isNativeNode(value) {
  return (
    typeof value === 'object' &&
    value != null &&
    typeof value.kind === 'number' &&
    typeof value.forEachChild === 'function'
  );
}
function isNativeNodeArray(value) {
  return (
    typeof value === 'object' &&
    value != null &&
    Array.isArray(value.nodes) &&
    typeof value.pos === 'number' &&
    typeof value.end === 'number'
  );
}
function createNativeNodeAdapter({ getSyntacticDiagnostics }) {
  const VIEW = Symbol('view');
  const nativeArrayToAdapter = new WeakMap();
  const childrenBySourceFile = new WeakMap();
  function releaseChildren(sourceFile) {
    childrenBySourceFile.delete(sourceFile);
    sourceFile.childrenCache = void 0;
  }
  function adaptArray(nodes) {
    const cached = nativeArrayToAdapter.get(nodes);
    if (cached) {
      return cached;
    }
    const adapted = [];
    const adaptedNodeArray = adapted;
    nativeArrayToAdapter.set(nodes, adaptedNodeArray);
    Object.assign(adaptedNodeArray, {
      end: nodes.end,
      hasTrailingComma: nodes.hasTrailingComma(),
      pos: nodes.pos,
      transformFlags: nodes.transformFlags,
    });
    for (const node of nodes.nodes) {
      if (!isReparsed(node)) {
        adapted.push(wrapNode(node));
      }
    }
    return adaptedNodeArray;
  }
  function createToken(native, kind, pos, end, parent) {
    const token = ts.factory.createIdentifier('');
    Object.defineProperties(token, {
      end: { value: end },
      kind: { value: kind },
      parent: { value: parent },
      pos: { value: pos },
    });
    token[NATIVE_NODE] = native;
    return token;
  }
  function getChildren(node) {
    const sourceFile = api.getSourceFileOfNode(node);
    let cache = childrenBySourceFile.get(sourceFile);
    if (!cache) {
      cache = new Map();
      childrenBySourceFile.set(sourceFile, cache);
    }
    const cached = cache.get(node);
    if (cached) {
      return cached;
    }
    const parent = wrapNode(node);
    const children = api.nativeChildren(node).flatMap(child => {
      if (isReparsed(child)) {
        return [];
      }
      if (child.kind !== NativeSyntaxKind.LessThanSlashToken) {
        return [wrapNode(child)];
      }
      return [
        createToken(child, ts.SyntaxKind.LessThanToken, child.pos, child.end - 1, parent),
        createToken(child, ts.SyntaxKind.SlashToken, child.end - 1, child.end, parent),
      ];
    });
    cache.set(node, children);
    return children;
  }
  function wrapToken(token) {
    if (token?.kind !== NativeSyntaxKind.LessThanSlashToken) {
      return token && wrapNode(token);
    }
    return getChildren(token.parent).find(child => child.pos === token.pos);
  }
  function readNative(target, property) {
    const value = Reflect.get(target, property);
    if (typeof value === 'number' && KIND_PROPERTIES.has(property)) {
      return translateKind(value);
    }
    if (isNativeNode(value)) {
      return isReparsed(value) ? void 0 : wrapNode(value);
    }
    if (isNativeNodeArray(value)) {
      const adapted = adaptArray(value);
      return adapted.length === 0 && property !== 'statements' && hasReparsedNode(value)
        ? void 0
        : adapted;
    }
    return value;
  }
  function hasReparsedNode(nodes) {
    for (const node of nodes.nodes) {
      if (isReparsed(node)) {
        return true;
      }
    }
    return false;
  }
  function readPostfixToken(target, property, kind) {
    const own = readNative(target, property);
    if (own != null) {
      return own;
    }
    const postfix = Reflect.get(target, 'postfixToken');
    return isNativeNode(postfix) && postfix.kind === kind ? wrapNode(postfix) : void 0;
  }
  const nodeMethods = {
    getEnd() {
      return this.end;
    },
    getFullStart() {
      return this.pos;
    },
    getFullWidth() {
      return this.end - this.pos;
    },
    getLineAndCharacterOfPosition(pos) {
      return api.getLineAndCharacterOfPosition(unwrap(this), pos);
    },
    getLineStarts() {
      return api.getLineStarts(unwrap(this));
    },
    getPositionOfLineAndCharacter(line, character) {
      return api.getPositionOfLineAndCharacter(unwrap(this), line, character);
    },
    forEachChild(visitor, visitArray) {
      return api.forEachChild(
        unwrap(this),
        child => (isReparsed(child) ? void 0 : visitor(wrapNode(child))),
        visitArray && (children => visitArray(adaptArray(children))),
      );
    },
    getChildAt(index) {
      return getChildren(unwrap(this))[index];
    },
    getChildCount() {
      return getChildren(unwrap(this)).length;
    },
    getChildren() {
      return getChildren(unwrap(this));
    },
    getFirstToken() {
      return wrapToken(api.getFirstToken(unwrap(this), api.getSourceFileOfNode(unwrap(this))));
    },
    getFullText() {
      return this.getSourceFile().text.slice(this.pos, this.end);
    },
    getLastToken() {
      return wrapToken(api.getLastToken(unwrap(this), api.getSourceFileOfNode(unwrap(this))));
    },
    getLeadingTriviaWidth() {
      return this.getStart() - this.pos;
    },
    getSourceFile() {
      return wrapNode(api.getSourceFileOfNode(unwrap(this)));
    },
    getStart(_sourceFile, includeJsDocComment) {
      return api.tokenStartOfNode(unwrap(this), includeJsDocComment);
    },
    getText() {
      return api.getTextOfNode(unwrap(this));
    },
    getWidth() {
      return this.end - this.getStart();
    },
  };
  function readClassic(target, property, receiver) {
    switch (property) {
      case 'jsDoc':
        return api.getJSDoc(target).map(wrapNode);
      case 'default':
        return readNative(target, 'defaultType');
      case 'elements':
        return target.kind === NativeSyntaxKind.ImportAttributes
          ? readNative(target, 'attributes')
          : readNative(target, property);
      case 'escapedText':
        return target.kind === NativeSyntaxKind.Identifier ||
          target.kind === NativeSyntaxKind.PrivateIdentifier
          ? ts.escapeLeadingUnderscores(target.text)
          : readNative(target, property);
      case 'exclamationToken':
        return readPostfixToken(target, property, NativeSyntaxKind.ExclamationToken);
      // Classic always spells a heritage element as an expression.
      case 'expression':
        if (isHeritageTypeReference(target)) {
          return wrapNode(target.typeName);
        }
        return isHeritageQualifiedName(target)
          ? readNative(target, 'left')
          : readNative(target, property);
      // Classic only counts modifiers where they are allowed to appear.
      case 'modifierFlagsCache':
        return (
          (ts.canHaveModifiers(receiver)
            ? (target.modifiers?.modifierFlags ?? ts.ModifierFlags.None)
            : ts.ModifierFlags.None) | ts.ModifierFlags.HasComputedFlags
        );
      case 'name':
        return isHeritageQualifiedName(target)
          ? readNative(target, 'right')
          : readNative(target, property);
      case 'parseDiagnostics': {
        if (target.kind !== NativeSyntaxKind.SourceFile) {
          return void 0;
        }
        const { fileName } = target;
        return getSyntacticDiagnostics(fileName).map(diagnostic =>
          toClassicDiagnostic(diagnostic, () => receiver),
        );
      }
      case 'questionToken':
        return readPostfixToken(target, property, NativeSyntaxKind.QuestionToken);
      default:
        return readNative(target, property);
    }
  }
  const viewPrototypes = new WeakMap();
  function createViewPrototype(nativePrototype, node) {
    const prototype = {};
    for (const name of FORWARDED_METHODS) {
      if (name in nativePrototype) {
        prototype[name] = function (...args) {
          return compilerCall(`Node.${name}`, () => this[NATIVE_NODE][name](...args));
        };
      }
    }
    Object.assign(prototype, compilerMethods({ ...nodeMethods }, 'Node'));
    for (const name of new Set([
      ...getGetterNames(nativePrototype),
      ...Object.keys(node).filter(key => !NATIVE_ONLY_KEYS.has(key)),
      ...CLASSIC_ONLY_KEYS,
      'questionToken',
      'exclamationToken',
      'elements',
      'jsDoc',
    ])) {
      if (EAGER_KEYS.has(name)) {
        continue;
      }
      Object.defineProperty(prototype, name, {
        configurable: true,
        enumerable: false,
        get() {
          const values = this[VALUES];
          if (values?.has(name)) {
            return values.get(name);
          }
          const value = compilerCall(`Node.${name}`, () =>
            readClassic(this[NATIVE_NODE], name, this),
          );
          (this[VALUES] ??= new Map()).set(name, value);
          return value;
        },
        set(value) {
          (this[VALUES] ??= new Map()).set(name, value);
        },
      });
    }
    return prototype;
  }
  function getViewPrototype(node) {
    const nativePrototype = Object.getPrototypeOf(node);
    let prototype = viewPrototypes.get(nativePrototype);
    if (!prototype) {
      prototype = createViewPrototype(nativePrototype, node);
      viewPrototypes.set(nativePrototype, prototype);
    }
    return prototype;
  }
  function unwrap(node) {
    const native = node[NATIVE_NODE];
    if (!native) {
      throw new CompilerContractError('The node was not created by a native node adapter.');
    }
    return native;
  }
  function wrapNode(node) {
    const cached = node[VIEW];
    if (cached) {
      return cached;
    }
    const view = Object.create(getViewPrototype(node));
    view[NATIVE_NODE] = node;
    view[VALUES] = void 0;
    view.kind = translateNodeKind(node);
    view.pos = node.pos;
    view.end = node.end;
    view.flags = translateNodeFlags(node);
    const adapted = view;
    node[VIEW] = adapted;
    return adapted;
  }
  return { releaseChildren, unwrapNode: unwrap, wrapNode };
}
export { createNativeNodeAdapter, toClassicDiagnostic };
