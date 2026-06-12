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

import type { Rule } from 'eslint';
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
    if (digestCall && methodName && TRUNCATION_METHODS.has(methodName)) {
      return true;
    }
    if (methodName === 'digest') {
      digestCall = grandParent;
    }
    node = grandParent;
  }

  return digestCall !== null && isBoundToTruncatedReference(context, digestCall);
}

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
  return !!variable && variable.references.some(ref => isIdentifierTruncated(ref.identifier));
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
  return isIdentifierTruncated(valueNode) || isBoundToTruncatedReference(context, valueNode);
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
  return !!variable && variable.references.some(ref => isIdentifierTruncated(ref.identifier));
}

function isIdentifierTruncated(identifier: estree.Node): boolean {
  const parent = getNodeParent(identifier);
  if (
    parent?.type !== 'MemberExpression' ||
    parent.object !== identifier ||
    parent.property.type !== 'Identifier' ||
    !TRUNCATION_METHODS.has(parent.property.name)
  ) {
    return false;
  }
  const grandParent = getNodeParent(parent);
  return grandParent?.type === 'CallExpression' && grandParent.callee === parent;
}
