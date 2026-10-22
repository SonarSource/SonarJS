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
// https://sonarsource.github.io/rspec/#/rspec/S2245/javascript

import type { Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import { ancestorsChain } from '../helpers/ancestor.js';
import { functionLike } from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getCurrentFileModuleReferences, getFullyQualifiedName } from '../helpers/module.js';
import * as meta from './generated-meta.js';

const CRYPTO_MODULES = new Set([
  'crypto',
  'node:crypto',
  'jsonwebtoken',
  'jose',
  'passport',
  'express-session',
  'cookie-session',
  'crypto-js',
  'node-forge',
  'tweetnacl',
  'sjcl',
  'jsrsasign',
  'elliptic',
  'bcrypt',
  'bcryptjs',
  'argon2',
  'scrypt',
  'pbkdf2',
  'jws',
  'jwt-simple',
  'express-jwt',
  'otplib',
  'speakeasy',
  'next-auth',
]);

const CRYPTO_PREFIXES = ['@noble/', '@aws-crypto/', '@auth/'];

const SECURITY_KEYWORDS = new Set([
  'aes',
  'asymmetric',
  'auth',
  'certificate',
  'chacha20',
  'cipher',
  'crypto',
  'cryptography',
  'decrypt',
  'ecc',
  'encrypt',
  'encryption',
  'hmac',
  'insecurerandom', // not in the ticket's list: class/function names like `InsecureRandomService`
  'iv',
  'nonce',
  'password',
  'pbkdf2',
  'poly1305',
  'randombytes',
  'rsa',
  'salt',
  'scrypt',
  'secret',
  'secure',
  'security',
  'sessionid',
  'signature',
  'token',
  'verify',
]);

// Wrappers and expression nodes that may sit between a function and the variable/property receiving its
// result, e.g. `const token = Array.from({ length: 16 }, () => Math.random())` or `(() => ...) as T`
const PASS_THROUGH = new Set([
  'CallExpression',
  'NewExpression',
  'MemberExpression',
  'ChainExpression',
  'ArrayExpression',
  'SpreadElement',
  'AwaitExpression',
  'ConditionalExpression',
  'LogicalExpression',
  'BinaryExpression',
  'UnaryExpression',
  'TemplateLiteral',
  'SequenceExpression',
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSNonNullExpression',
  'TSTypeAssertion',
]);

// `import x from 'crypto-js/aes'` counts as 'crypto-js'; `@scope/pkg/sub` as '@scope/pkg'
function packageName(moduleName: string) {
  const parts = moduleName.split('/');
  return moduleName.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function isCryptoModule(moduleName: string) {
  return (
    CRYPTO_MODULES.has(moduleName) ||
    CRYPTO_MODULES.has(packageName(moduleName)) ||
    CRYPTO_PREFIXES.some(prefix => moduleName.startsWith(prefix))
  );
}

// Splits camelCase/snake_case names into lowercase words. A word matches a keyword when the word itself,
// its letters-only parts (`aes256` -> `aes`, but `pbkdf2` still matches whole), or the word joined with the
// previous one match, so that `sessionId` matches `sessionid` and `randomBytes` matches `randombytes`.
function hasKeyword(identifier: string) {
  const words = identifier
    .replaceAll(/(?<=[a-z\d])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/g, ' ')
    .toLowerCase()
    .split(/[^a-z\d]+/)
    .filter(Boolean);
  return words.some(
    (word, i) =>
      SECURITY_KEYWORDS.has(word) ||
      word.split(/\d+/).some(part => SECURITY_KEYWORDS.has(part)) ||
      (i > 0 && SECURITY_KEYWORDS.has(words[i - 1] + word)),
  );
}

function isIdentifier(token: { type: string }) {
  return token.type === 'Identifier' || token.type === 'PrivateIdentifier';
}

function isNode(value: unknown): value is estree.Node {
  return typeof (value as estree.Node | undefined)?.type === 'string';
}

function childNodes(sourceCode: SourceCode, node: estree.Node): estree.Node[] {
  return (sourceCode.visitorKeys[node.type] ?? []).flatMap(key => {
    const child = (node as unknown as Record<string, unknown>)[key];
    return (Array.isArray(child) ? child : [child]).filter(isNode);
  });
}

// ranges of the outermost functions inside the scope, sorted by position
function nestedFunctionRanges(sourceCode: SourceCode, scope: estree.Node) {
  const ranges: [number, number][] = [];
  const pending: estree.Node[] = [scope];
  for (let node = pending.pop(); node; node = pending.pop()) {
    for (const child of childNodes(sourceCode, node)) {
      if (functionLike.has(child.type)) {
        ranges.push(sourceCode.getRange(child));
      } else {
        pending.push(child);
      }
    }
  }
  return ranges.sort((a, b) => a[0] - b[0]);
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      safeGenerator: 'Make sure that using this pseudorandom number generator is safe here.',
    },
  }),
  create(context: Rule.RuleContext) {
    const sourceCode = context.sourceCode;
    let hasCryptoImport: boolean | undefined;

    function importsCrypto() {
      hasCryptoImport ??= [...getCurrentFileModuleReferences(sourceCode)].some(isCryptoModule);
      return hasCryptoImport;
    }

    // identifiers in the range, nested functions included (used for headers and naming targets)
    function scanRange(range: [number, number]) {
      return sourceCode
        .getTokens({ range } as Rule.Node)
        .some(token => isIdentifier(token) && hasKeyword(token.value));
    }

    // identifiers of the scope itself; nested functions are other scopes and are skipped
    function scanLocal(scope: Rule.Node) {
      const skipped = nestedFunctionRanges(sourceCode, scope);
      let next = 0;
      return sourceCode.getTokens(scope).some(token => {
        const start = token.range[0];
        while (next < skipped.length && skipped[next][1] <= start) {
          next++;
        }
        const inNestedFunction = next < skipped.length && skipped[next][0] <= start;
        return !inNestedFunction && isIdentifier(token) && hasKeyword(token.value);
      });
    }

    // one scan per scope: Math.random() is often called many times in the same scope
    const localCache = new Map<Rule.Node, boolean>();
    const headerCache = new Map<Rule.Node, boolean>();
    const namingCache = new Map<TSESTree.Node, boolean>();

    function cached<K>(cache: Map<K, boolean>, key: K, scan: () => boolean) {
      let result = cache.get(key);
      if (result === undefined) {
        result = scan();
        cache.set(key, result);
      }
      return result;
    }

    // the name receiving the function or its result: `const generateToken = () => ...`,
    // `{ makeSecret() {} }`, `const token = Array.from(..., () => Math.random())`, `(() => ...) as T`
    function namingTarget(fn: Rule.Node): TSESTree.Node | undefined {
      let parent = (fn as TSESTree.Node).parent;
      while (parent && PASS_THROUGH.has(parent.type)) {
        parent = parent.parent;
      }
      switch (parent?.type) {
        case 'VariableDeclarator':
          return parent.id;
        case 'AssignmentExpression':
          return parent.left;
        case 'Property':
        case 'MethodDefinition':
        case 'PropertyDefinition':
          return parent.key;
        default:
          return undefined;
      }
    }

    function nameHasKeyword(fn: Rule.Node) {
      const target = namingTarget(fn);
      return (
        target !== undefined &&
        cached(namingCache, target, () => scanRange(sourceCode.getRange(target as Rule.Node)))
      );
    }

    // name and parameters only, so that an anonymous module wrapper (IIFE/AMD) does not drag the whole file in
    function headerHasKeyword(fn: Rule.Node) {
      const body = (fn as unknown as estree.Function).body as Rule.Node;
      return cached(headerCache, fn, () =>
        scanRange([sourceCode.getRange(fn)[0], sourceCode.getRange(body)[0]]),
      );
    }

    // names of enclosing classes, e.g. `InsecureRandomService` around its methods
    function classNameHasKeyword(node: Rule.Node) {
      return ancestorsChain(node as TSESTree.Node, new Set())
        .filter(n => n.type === 'ClassDeclaration' || n.type === 'ClassExpression')
        .some(cls => {
          const target = (cls as TSESTree.ClassDeclaration).id ?? namingTarget(cls as Rule.Node);
          return (
            target !== undefined &&
            cached(namingCache, target, () => scanRange(sourceCode.getRange(target as Rule.Node)))
          );
        });
    }

    function isSecurityContext(node: Rule.Node) {
      if (importsCrypto()) {
        return true;
      }
      // innermost function first; callbacks inside `generatePassword` are still reported via its header
      const [inner, ...outer] = ancestorsChain(node as TSESTree.Node, new Set()).filter(
        n => functionLike.has(n.type) && n.type !== 'MethodDefinition', // its `value` is already in the chain
      ) as Rule.Node[];
      const inScope =
        inner === undefined
          ? cached(localCache, sourceCode.ast as Rule.Node, () =>
              scanLocal(sourceCode.ast as Rule.Node),
            )
          : cached(localCache, inner, () => scanLocal(inner)) ||
            nameHasKeyword(inner) ||
            outer.some(fn => headerHasKeyword(fn) || nameHasKeyword(fn));
      return inScope || classNameHasKeyword(node);
    }

    return {
      CallExpression(node: estree.CallExpression) {
        const fqn = getFullyQualifiedName(context, node);
        if (fqn === 'Math.random' && isSecurityContext(node as Rule.Node)) {
          context.report({
            messageId: 'safeGenerator',
            node,
          });
        }
      },
    };
  },
};
