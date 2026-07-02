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

export type ChaiPredicate =
  | 'truthy'
  | 'falsy'
  | 'true'
  | 'false'
  | 'defined'
  | 'undefined'
  | 'null'
  | 'exists';

export function getChaiPropertyPredicate(
  name: string,
): { predicate: ChaiPredicate; negated: boolean } | null {
  switch (name) {
    case 'ok':
      return { predicate: 'truthy', negated: false };
    // chai's `.true`/`.false` are strict (`=== true`/`=== false`), unlike `.ok`, which accepts
    // any truthy/falsy value
    case 'true':
      return { predicate: 'true', negated: false };
    case 'false':
      return { predicate: 'false', negated: false };
    case 'null':
      return { predicate: 'null', negated: false };
    case 'undefined':
      return { predicate: 'undefined', negated: false };
    // chai's `.exist` is stricter than "defined": it requires not-null AND not-undefined
    case 'exist':
    case 'exists':
      return { predicate: 'exists', negated: false };
    default:
      return null;
  }
}

export function getArgumentAtIndex(node: estree.CallExpression, index: number): estree.Node | null {
  const argument = node.arguments[index];
  if (!argument || argument.type === 'SpreadElement') {
    return null;
  }
  return argument;
}
