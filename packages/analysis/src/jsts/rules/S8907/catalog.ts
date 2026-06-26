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

type Replacement = {
  alternative: string;
  minimumEcmaVersion: number;
  reason?: string;
  example?: string;
};

const ES5 = 5;
const ES2015 = 2015;
const ES2016 = 2016;
const ES2017 = 2017;
const ES2019 = 2019;

const ARRAY_SLICE_ALTERNATIVE = 'Array.prototype.slice()';
const OBJECT_ENTRIES_ALTERNATIVE = 'Object.entries()';
const ARRAY_NULLISH_REASON = 'the library handles nullish values differently from the native API';
const COLLECTION_REASON = 'the library also accepts objects and nullish values';
const COLLECTION_PREDICATE_REASON =
  'the library also accepts objects, nullish values, and shorthand predicates';
const ASSIGN_REASON = 'the library handles nullish targets differently from Object.assign';

/**
 * First-version catalog: keep high-confidence native API recommendations only.
 * Included methods have a clear native API target and either a local helper API
 * replacement, an object helper replacement, or an array/string receiver check.
 *
 * Removed or deferred because they were noisy in ruling:
 * - Collection aliases: all, any, collect, detect, each, forEach, foldl, foldr, inject, select.
 * - Object collection rewrites: Object.values()/Object.entries() alternatives for map/filter/reduce.
 * - String coercion helpers: endsWith, padEnd, padStart, repeat, replace, split, startsWith,
 *   toLower, toUpper, trim.
 * - Subtle semantic helpers: bind, isFinite, isNaN.
 */
const replacements: Record<string, Replacement> = {
  assign: cautious('Object.assign()', ASSIGN_REASON, ES2015),
  concat: cautious('Array.prototype.concat()', ARRAY_NULLISH_REASON, ES5),
  contains: cautious(
    'Array.prototype.includes()',
    'the library also accepts strings, objects, and nullish values',
    ES2016,
  ),
  drop: cautious(ARRAY_SLICE_ALTERNATIVE, ARRAY_NULLISH_REASON, ES5, '`array.slice(n)`'),
  dropRight: cautious(
    ARRAY_SLICE_ALTERNATIVE,
    ARRAY_NULLISH_REASON,
    ES5,
    '`n === 0 ? array.slice() : array.slice(0, -n)`',
  ),
  entries: cautious(OBJECT_ENTRIES_ALTERNATIVE, ARRAY_NULLISH_REASON, ES2017),
  every: cautious('Array.prototype.every()', COLLECTION_PREDICATE_REASON, ES5),
  extendOwn: cautious('Object.assign()', ARRAY_NULLISH_REASON, ES2015),
  fill: cautious('Array.prototype.fill()', ARRAY_NULLISH_REASON, ES2015),
  filter: cautious('Array.prototype.filter()', COLLECTION_PREDICATE_REASON, ES5),
  find: cautious('Array.prototype.find()', COLLECTION_PREDICATE_REASON, ES2015),
  findIndex: cautious('Array.prototype.findIndex()', COLLECTION_PREDICATE_REASON, ES2015),
  flatten: cautious(
    'Array.prototype.flat()',
    'the library handles nullish values differently from the native API',
    ES2019,
  ),
  includes: cautious(
    'Array.prototype.includes()',
    'the library also accepts strings, objects, and nullish values',
    ES2016,
  ),
  indexOf: cautious('Array.prototype.indexOf()', ARRAY_NULLISH_REASON, ES5),
  isArray: direct('Array.isArray()', ES5),
  isInteger: direct('Number.isInteger()', ES2015),
  join: cautious('Array.prototype.join()', ARRAY_NULLISH_REASON, ES5),
  keys: cautious('Object.keys()', ARRAY_NULLISH_REASON, ES5),
  lastIndexOf: cautious('Array.prototype.lastIndexOf()', ARRAY_NULLISH_REASON, ES5),
  map: cautious('Array.prototype.map()', COLLECTION_REASON, ES5),
  pairs: cautious(OBJECT_ENTRIES_ALTERNATIVE, ARRAY_NULLISH_REASON, ES2017),
  reduce: cautious('Array.prototype.reduce()', COLLECTION_PREDICATE_REASON, ES5),
  reduceRight: cautious('Array.prototype.reduceRight()', COLLECTION_PREDICATE_REASON, ES5),
  reverse: cautious('Array.prototype.reverse()', ARRAY_NULLISH_REASON, ES5),
  slice: cautious(ARRAY_SLICE_ALTERNATIVE, ARRAY_NULLISH_REASON, ES5),
  some: cautious('Array.prototype.some()', COLLECTION_PREDICATE_REASON, ES5),
  takeRight: cautious(
    ARRAY_SLICE_ALTERNATIVE,
    ARRAY_NULLISH_REASON,
    ES5,
    '`n === 0 ? [] : array.slice(-n)`',
  ),
  toPairs: cautious(OBJECT_ENTRIES_ALTERNATIVE, ARRAY_NULLISH_REASON, ES2017),
  uniq: cautious('Set', ARRAY_NULLISH_REASON, ES2015, '`[...new Set(values)]`'),
  values: cautious('Object.values()', ARRAY_NULLISH_REASON, ES2017),
};

const methodNames = new Set(Object.keys(replacements));
const methodNamesByLowerCase = new Map(
  Object.keys(replacements).map(method => [method.toLowerCase(), method]),
);
const shapeDependentMethods = new Set([
  'contains',
  'every',
  'filter',
  'find',
  'findIndex',
  'includes',
  'map',
  'reduce',
  'reduceRight',
  'some',
]);
const callbackCollectionMethods = new Set(
  [...shapeDependentMethods].filter(method => method !== 'contains' && method !== 'includes'),
);

function direct(alternative: string, minimumEcmaVersion: number): Replacement {
  return { alternative, minimumEcmaVersion };
}

function cautious(
  alternative: string,
  reason: string,
  minimumEcmaVersion: number,
  example?: string,
): Replacement {
  return { alternative, reason, minimumEcmaVersion, example };
}

export {
  callbackCollectionMethods,
  methodNames,
  methodNamesByLowerCase,
  replacements,
  shapeDependentMethods,
};
export type { Replacement };
