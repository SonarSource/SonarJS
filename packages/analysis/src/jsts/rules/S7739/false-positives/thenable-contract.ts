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
import type { Node } from 'estree';
import { getNodeParent } from '../../helpers/ancestor.js';
import { getAncestorsWithParent } from '../helpers.js';

// Matches the contract names used by JSDoc `@implements` annotations and TypeScript
// `implements` heritage clauses to declare an intentional thenable implementation.
const THENABLE_CONTRACT_PATTERN = /\b(?:IThenable|Thenable|PromiseLike)\b/;

/**
 * Checks if the reported node is the key of the MethodDefinition/PropertyDefinition it
 * belongs to. The upstream unicorn rule resolves class member keys with
 * getPropertyName/getStaticValue before reporting, so it only ever reports a key it has
 * already determined to be 'then' — including quoted and statically-known computed keys
 * (`['then']`, `` [`then`] ``, `[KEY]` where `KEY = 'then'`) — so no further name check is
 * needed here.
 */
function isThenMemberKey(
  member: TSESTree.MethodDefinition | TSESTree.PropertyDefinition,
  node: Node,
): boolean {
  return (member.key as unknown as Node) === node;
}

/**
 * Checks if a class method or field named 'then' belongs to a class that explicitly
 * declares a thenable contract, via JSDoc `@implements {IThenable}` (or
 * `Thenable`/`PromiseLike`) or a TypeScript `implements` heritage clause naming one of
 * those same contracts.
 *
 * Uses the nearest MethodDefinition/PropertyDefinition/class ancestors (via
 * getAncestorsWithParent, which walks the parent chain innermost-first) so that a `then`
 * member declared on a class nested inside another class's method is attributed to its
 * own declaration, not to an unrelated enclosing class that happens to declare the
 * contract itself.
 *
 * Excludes static members: an `implements`/`@implements` thenable contract describes the
 * instance shape, not the class object itself, so a `static then` still makes the class
 * object thenable (e.g. `await import()` of a module default-exporting it) and must
 * remain reported regardless of the instance-side contract.
 */
export function isClassThenMethodWithThenableContract(
  context: Rule.RuleContext,
  node: Node,
): boolean {
  const ancestors = getAncestorsWithParent(node);
  const member = ancestors[0] as unknown as TSESTree.Node | undefined;
  if (
    (member?.type !== 'MethodDefinition' && member?.type !== 'PropertyDefinition') ||
    member.static ||
    !isThenMemberKey(member, node)
  ) {
    return false;
  }

  const containingClass = ancestors.find(
    ancestor => ancestor.type === 'ClassDeclaration' || ancestor.type === 'ClassExpression',
  );
  if (!containingClass) {
    return false;
  }

  return hasExplicitThenableContract(context, containingClass);
}

function hasExplicitThenableContract(context: Rule.RuleContext, classNode: Node): boolean {
  return (
    hasJSDocThenableContract(context, classNode) ||
    hasTypeScriptThenableContract(context, classNode)
  );
}

/**
 * Checks the JSDoc block comment leading the class for an `@implements` tag naming a
 * thenable contract. Walks up through the class's `const`/`let`/`var` declarator and
 * declaration, and any `export`/`export default` wrapper, since the JSDoc precedes
 * whichever of those is outermost rather than the `class` keyword itself (e.g.
 * `/** @implements {IThenable} *\/ const Foo = class { ... }`).
 */
function hasJSDocThenableContract(context: Rule.RuleContext, classNode: Node): boolean {
  let commentTarget = classNode;
  let parent = getNodeParent(commentTarget);
  while (
    parent?.type === 'VariableDeclarator' ||
    parent?.type === 'VariableDeclaration' ||
    parent?.type === 'ExportNamedDeclaration' ||
    parent?.type === 'ExportDefaultDeclaration'
  ) {
    commentTarget = parent;
    parent = getNodeParent(commentTarget);
  }

  return context.sourceCode
    .getCommentsBefore(commentTarget)
    .some(comment => comment.type === 'Block' && hasImplementsThenableContract(comment.value));
}

/**
 * Matches an `@implements` JSDoc tag and captures only the braced type it names, so the
 * thenable-contract pattern is tested against that type and not against unrelated prose
 * elsewhere on the same line.
 */
const IMPLEMENTS_TAG_PATTERN = /@implements\s*\{([^}]*)\}/;

function hasImplementsThenableContract(comment: string): boolean {
  return comment.split(/\r?\n/).some(line => {
    const match = IMPLEMENTS_TAG_PATTERN.exec(line);
    if (match === null) {
      return false;
    }
    // Test only the named type, not its type arguments, so a class implementing an
    // unrelated interface merely parameterized by a thenable type (e.g.
    // `@implements {Cache<PromiseLike<Data>>}`) isn't mistaken for an explicit contract —
    // mirrors hasTypeScriptThenableContract's exclusion of heritage-clause type arguments.
    const typeName = match[1].split('<')[0].trim();
    return THENABLE_CONTRACT_PATTERN.test(typeName);
  });
}

/**
 * Checks the class's TypeScript `implements` heritage clause for an entry naming a
 * thenable contract. Tests only the implemented interface name (the heritage entry's
 * `expression`), not its type arguments, so a class implementing an unrelated interface
 * merely parameterized by a thenable type (e.g. `implements Cache<PromiseLike<Data>>`)
 * is not mistaken for an explicit thenable contract.
 */
function hasTypeScriptThenableContract(context: Rule.RuleContext, classNode: Node): boolean {
  const tsClassNode = classNode as unknown as TSESTree.Node;
  if (tsClassNode.type !== 'ClassDeclaration' && tsClassNode.type !== 'ClassExpression') {
    return false;
  }
  // `implements` is only populated by the TypeScript ESLint parser; a class parsed as plain
  // JavaScript has no such field at runtime despite the TSESTree type claiming otherwise.
  const heritageEntries = tsClassNode.implements ?? [];
  return heritageEntries.some(entry =>
    THENABLE_CONTRACT_PATTERN.test(context.sourceCode.getText(entry.expression as unknown as Node)),
  );
}
