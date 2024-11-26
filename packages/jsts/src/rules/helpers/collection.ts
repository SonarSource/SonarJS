/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
export const collectionConstructor = ['Array', 'Map', 'Set', 'WeakSet', 'WeakMap'];

export const writingMethods = [
  // array methods
  'copyWithin',
  'fill',
  'pop',
  'push',
  'reverse',
  'set',
  'shift',
  'sort',
  'splice',
  'unshift',
  // map, set methods
  'add',
  'clear',
  'delete',
];

export const sortLike = ['sort', '"sort"', "'sort'"];
export const copyingSortLike = ['toSorted', '"toSorted"', "'toSorted'"];

export function flatMap<A, B>(xs: A[], f: (e: A) => B[]): B[] {
  const acc: B[] = [];
  for (const x of xs) {
    acc.push(...f(x));
  }
  return acc;
}

export function last<T>(arr: Array<T>) {
  return arr[arr.length - 1];
}
