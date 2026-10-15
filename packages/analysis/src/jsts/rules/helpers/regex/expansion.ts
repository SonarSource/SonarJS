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
import type { AST } from '@eslint-community/regexpp';

const MAX_PATHS = 64;
const MAX_ELEMENTS = 256;
const MAX_DEPTH = 16;

/**
 * Expands groups and exact-one repetitions without copying AST nodes.
 * Other repetitions and assertions remain atoms. Exceeded limits return null.
 */
export function expandRegexAlternatives(
  alternatives: readonly AST.Alternative[],
  depth = 0,
): AST.Element[][] | null {
  if (depth > MAX_DEPTH) {
    return null;
  }
  const paths: AST.Element[][] = [];
  for (const alternative of alternatives) {
    const current = expandAlternative(alternative, depth);
    if (!current || paths.length + current.length > MAX_PATHS) {
      return null;
    }
    paths.push(...current);
  }
  return paths;
}

function expandAlternative(alternative: AST.Alternative, depth: number): AST.Element[][] | null {
  let current: AST.Element[][] = [[]];
  for (const element of alternative.elements) {
    const expanded = expandElement(element, depth);
    if (!expanded) {
      return null;
    }
    const next = concatenate(current, expanded);
    if (!next) {
      return null;
    }
    current = next;
  }
  return current;
}

function concatenate(prefixes: AST.Element[][], suffixes: AST.Element[][]): AST.Element[][] | null {
  if (prefixes.length * suffixes.length > MAX_PATHS) {
    return null;
  }
  const result: AST.Element[][] = [];
  for (const prefix of prefixes) {
    for (const suffix of suffixes) {
      if (prefix.length + suffix.length > MAX_ELEMENTS) {
        return null;
      }
      result.push([...prefix, ...suffix]);
    }
  }
  return result;
}

function expandElement(element: AST.Element, depth: number): AST.Element[][] | null {
  if (depth > MAX_DEPTH) {
    return null;
  }
  if (element.type === 'Group' || element.type === 'CapturingGroup') {
    return expandRegexAlternatives(element.alternatives, depth + 1);
  }
  if (element.type === 'Quantifier' && element.min === 1 && element.max === 1) {
    return expandElement(element.element, depth + 1);
  }
  return [[element]];
}
