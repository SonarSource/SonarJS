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
// https://sonarsource.github.io/rspec/#/rspec/S4790/javascript

import type { Rule, Scope } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { getFullyQualifiedName } from '../helpers/module.js';
import { getNodeParent } from '../helpers/ancestor.js';
import { getUniqueWriteUsageOrNode, getVariableFromName, isStringLiteral } from '../helpers/ast.js';
import * as meta from './generated-meta.js';

const message = 'Make sure this weak hash algorithm is not used in a sensitive context here.';
const CRYPTO_UNSECURE_HASH_ALGORITHMS = new Set([
  'md2',
  'md4',
  'md5',
  'md6',
  'haval128',
  'hmacmd5',
  'dsa',
  'ripemd',
  'ripemd128',
  'ripemd160',
  'hmacripemd160',
  'sha1',
]);
const SUBTLE_UNSECURE_HASH_ALGORITHMS = new Set(['sha-1']);
const TRUNCATION_METHODS = new Set(['slice', 'substring']);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
  create(context: Rule.RuleContext) {
    function checkNodejsCrypto(fqn: string | null, node: estree.CallExpression) {
      // crypto#createHash
      const { callee, arguments: args } = node;
      if (fqn === 'crypto.createHash' && !isDigestTruncated(context, node)) {
        checkUnsecureAlgorithm(callee, args[0], CRYPTO_UNSECURE_HASH_ALGORITHMS);
      }
    }

    function checkSubtleCrypto(fqn: string | null, node: estree.CallExpression) {
      // crypto.subtle#digest
      const { callee, arguments: args } = node;
      if (fqn === 'crypto.subtle.digest' && !isSubtleDigestTruncated(context, node)) {
        checkUnsecureAlgorithm(callee, args[0], SUBTLE_UNSECURE_HASH_ALGORITHMS);
      }
    }

    function checkUnsecureAlgorithm(
      method: estree.Node,
      hash: estree.Node,
      unsecureAlgorithms: Set<string>,
    ) {
      const hashAlgorithm = getUniqueWriteUsageOrNode(context, hash);
      if (
        isStringLiteral(hashAlgorithm) &&
        unsecureAlgorithms.has(hashAlgorithm.value.toLocaleLowerCase())
      ) {
        context.report({
          message,
          node: method,
        });
      }
    }

    return {
      'CallExpression[arguments.length > 0]': (node: estree.Node) => {
        const callExpr = node as estree.CallExpression;
        const fqn = getFullyQualifiedName(context, callExpr);
        checkNodejsCrypto(fqn, callExpr);
        checkSubtleCrypto(fqn, callExpr);
      },
    };
  },
};

// A truncated digest cannot serve password storage, signing, or integrity checks — those all need the
// full output — so the use is non-cryptographic (short identifier, cache key, ETag).
function isDigestTruncated(
  context: Rule.RuleContext,
  createHashCall: estree.CallExpression,
): boolean {
  let node: estree.Node = createHashCall;
  let digestCall: estree.CallExpression | null = null;

  while (true) {
    const parent = getNodeParent(node);
    if (parent?.type !== 'MemberExpression' || parent.object !== node) {
      break;
    }
    const grandParent = getNodeParent(parent);
    if (grandParent?.type !== 'CallExpression' || grandParent.callee !== parent) {
      break;
    }
    const methodName = parent.property.type === 'Identifier' ? parent.property.name : null;
    if (digestCall && isTruncationCall(context, grandParent)) {
      return true;
    }
    if (methodName === 'digest') {
      digestCall = grandParent;
    }
    node = grandParent;
  }

  return digestCall !== null && isBoundToTruncatedReference(context, digestCall);
}

// Only suppress when every read of the bound digest is truncated — otherwise a mixed-use binding
// (one full + one sliced) would silently silence the sensitive use. Write refs are skipped: the
// declarator init is itself a write and reassignments don't consume the value.
function isBoundToTruncatedReference(context: Rule.RuleContext, initNode: estree.Node): boolean {
  const declarator = getNodeParent(initNode);
  if (
    declarator?.type !== 'VariableDeclarator' ||
    declarator.init !== initNode ||
    declarator.id.type !== 'Identifier'
  ) {
    return false;
  }
  const variable = getVariableFromName(context, declarator.id.name, declarator.id);
  return !!variable && hasOnlyTruncatedReads(context, variable);
}

function hasOnlyTruncatedReads(context: Rule.RuleContext, variable: Scope.Variable): boolean {
  const reads = variable.references.filter(ref => ref.isRead());
  return reads.length > 0 && reads.every(ref => isIdentifierTruncated(context, ref.identifier));
}

// crypto.subtle.digest(...) returns Promise<ArrayBuffer>. Truncation can happen via .then callback,
// after await on a binding, or immediately on the awaited value.
function isSubtleDigestTruncated(
  context: Rule.RuleContext,
  digestCall: estree.CallExpression,
): boolean {
  if (isPromiseThenTruncated(context, digestCall)) {
    return true;
  }
  const parent = getNodeParent(digestCall);
  const valueNode = parent?.type === 'AwaitExpression' ? parent : digestCall;
  return (
    isIdentifierTruncated(context, valueNode) || isBoundToTruncatedReference(context, valueNode)
  );
}

function isPromiseThenTruncated(
  context: Rule.RuleContext,
  digestCall: estree.CallExpression,
): boolean {
  const member = getNodeParent(digestCall);
  if (
    member?.type !== 'MemberExpression' ||
    member.object !== digestCall ||
    member.property.type !== 'Identifier' ||
    member.property.name !== 'then'
  ) {
    return false;
  }
  const thenCall = getNodeParent(member);
  if (
    thenCall?.type !== 'CallExpression' ||
    thenCall.callee !== member ||
    thenCall.arguments.length === 0
  ) {
    return false;
  }
  const callback = thenCall.arguments[0];
  if (
    (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression') ||
    callback.params.length === 0 ||
    callback.params[0].type !== 'Identifier'
  ) {
    return false;
  }
  const param = callback.params[0];
  const variable = getVariableFromName(context, param.name, param);
  return !!variable && hasOnlyTruncatedReads(context, variable);
}

function isIdentifierTruncated(context: Rule.RuleContext, identifier: estree.Node): boolean {
  const parent = getNodeParent(identifier);
  if (parent?.type !== 'MemberExpression' || parent.object !== identifier) {
    return false;
  }
  const grandParent = getNodeParent(parent);
  return (
    grandParent?.type === 'CallExpression' &&
    grandParent.callee === parent &&
    isTruncationCall(context, grandParent)
  );
}

const UNKNOWN_VALUE = Symbol('unknown');
type StaticValue = number | undefined | typeof UNKNOWN_VALUE;
type SubstringKind = 'zero' | 'length' | 'other';

// Treat `slice` / `substring` as truncation unless the argument pattern obviously preserves the
// whole output. This keeps named constants and unresolved bounds in scope while excluding simple
// no-op forms like `.slice()`, `.slice(0, undefined)`, or `.substring('foo')`.
function isTruncationCall(context: Rule.RuleContext, call: estree.CallExpression): boolean {
  if (call.callee.type !== 'MemberExpression' || call.callee.property.type !== 'Identifier') {
    return false;
  }
  const method = call.callee.property.name;
  if (!TRUNCATION_METHODS.has(method)) {
    return false;
  }
  return !isObviouslyFullOutput(context, method, call.arguments);
}

function isObviouslyFullOutput(
  context: Rule.RuleContext,
  method: string,
  args: Array<estree.Node | estree.SpreadElement>,
): boolean {
  if (args.length === 0) {
    return true;
  }
  if (method === 'slice') {
    return isSliceFullOutput(context, args);
  }
  return isSubstringFullOutput(context, args);
}

function isSliceFullOutput(
  context: Rule.RuleContext,
  args: Array<estree.Node | estree.SpreadElement>,
): boolean {
  if (!isSliceNoOpStart(resolveStaticValue(context, args[0]))) {
    return false;
  }
  return args.length === 1 || isSliceFullOutputEnd(resolveStaticValue(context, args[1]));
}

function isSubstringFullOutput(
  context: Rule.RuleContext,
  args: Array<estree.Node | estree.SpreadElement>,
): boolean {
  const startKind = getSubstringStartKind(resolveStaticValue(context, args[0]));
  if (args.length === 1) {
    return startKind === 'zero';
  }
  const endKind = getSubstringEndKind(resolveStaticValue(context, args[1]));
  return (
    (startKind === 'zero' && endKind === 'length') || (startKind === 'length' && endKind === 'zero')
  );
}

function isSliceNoOpStart(value: StaticValue): boolean {
  return value === undefined || (typeof value === 'number' && (value === 0 || Number.isNaN(value)));
}

function isSliceFullOutputEnd(value: StaticValue): boolean {
  return value === undefined || value === Infinity;
}

function getSubstringStartKind(value: StaticValue): SubstringKind {
  if (value === undefined) {
    return 'zero';
  }
  if (typeof value === 'number') {
    if (value === Infinity) {
      return 'length';
    }
    if (value <= 0 || Number.isNaN(value)) {
      return 'zero';
    }
  }
  return 'other';
}

function getSubstringEndKind(value: StaticValue): SubstringKind {
  if (value === undefined) {
    return 'length';
  }
  if (typeof value === 'number') {
    if (value === Infinity) {
      return 'length';
    }
    if (value <= 0 || Number.isNaN(value)) {
      return 'zero';
    }
  }
  return 'other';
}

function resolveStaticValue(
  context: Rule.RuleContext,
  node: estree.Node | estree.SpreadElement,
): StaticValue {
  if (node.type === 'SpreadElement') {
    return UNKNOWN_VALUE;
  }
  return getStaticValue(getUniqueWriteUsageOrNode(context, node, true));
}

function getStaticValue(node: estree.Node): StaticValue {
  if (node.type === 'Literal') {
    return coerceLiteralValue(node.value);
  }
  if (node.type === 'Identifier') {
    if (node.name === 'undefined') {
      return undefined;
    }
    if (node.name === 'Infinity') {
      return Infinity;
    }
    if (node.name === 'NaN') {
      return NaN;
    }
    return UNKNOWN_VALUE;
  }
  if (node.type === 'UnaryExpression' && (node.operator === '+' || node.operator === '-')) {
    const value = getStaticValue(node.argument);
    if (value === UNKNOWN_VALUE) {
      return UNKNOWN_VALUE;
    }
    if (value === undefined) {
      return NaN;
    }
    return node.operator === '+' ? value : -value;
  }
  return UNKNOWN_VALUE;
}

function coerceLiteralValue(value: estree.Literal['value']): StaticValue {
  switch (typeof value) {
    case 'number':
      return value;
    case 'string':
    case 'boolean':
    case 'bigint':
      return Number(value);
    case 'object':
      return value === null ? 0 : UNKNOWN_VALUE;
    default:
      return UNKNOWN_VALUE;
  }
}
