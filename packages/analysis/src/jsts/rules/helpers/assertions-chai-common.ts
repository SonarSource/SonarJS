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

export type ChaiPredicate = 'truthy' | 'falsy' | 'defined' | 'undefined' | 'null';

export function getChaiPropertyPredicate(
  name: string,
): { predicate: ChaiPredicate; negated: boolean } | null {
  switch (name) {
    case 'true':
    case 'ok':
      return { predicate: 'truthy', negated: false };
    case 'false':
      return { predicate: 'falsy', negated: false };
    case 'null':
      return { predicate: 'null', negated: false };
    case 'undefined':
      return { predicate: 'undefined', negated: false };
    case 'exist':
    case 'exists':
      return { predicate: 'defined', negated: false };
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
