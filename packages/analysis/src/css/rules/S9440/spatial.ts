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
import valueParser from 'postcss-value-parser';

export const spatialProperties = new Set([
  'transform',
  'translate',
  'rotate',
  'scale',
  'top',
  'right',
  'bottom',
  'left',
  'inset',
  'inset-block',
  'inset-block-start',
  'inset-block-end',
  'inset-inline',
  'inset-inline-start',
  'inset-inline-end',
  'width',
  'height',
  'min-width',
  'min-height',
  'max-width',
  'max-height',
]);
export const transformProperties = new Set(['transform', 'translate', 'rotate', 'scale']);

function normalizedWord(value: string): string {
  const match = /^([-+]?(?:\d+(?:\.\d*)?|\.\d+))([a-z%]*)$/i.exec(value);
  if (!match) {
    return value.toLowerCase();
  }
  const number = Number(match[1]);
  return number === 0 ? '0' : `${number}${match[2].toLowerCase()}`;
}

function identityFunction(name: string, args: string[]): boolean {
  if (/^(translate(?:3d|[xyz])?|rotate[xyz]?|skew[xy]?)$/.test(name)) {
    return args.length > 0 && args.every((arg: string): boolean => arg === '0');
  }
  if (/^scale(?:3d|[xyz])?$/.test(name)) {
    return args.length > 0 && args.every((arg: string): boolean => arg === '1');
  }
  if (name === 'rotate3d') {
    return args.length === 4 && args.at(-1) === '0';
  }
  const identity = name === 'matrix' ? '1,0,0,1,0,0' : '1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1';
  return (name === 'matrix' || name === 'matrix3d') && args.join(',') === identity;
}

function normalizedTransform(name: string, args: string[]): string | undefined {
  if (identityFunction(name, args)) {
    return '';
  }
  switch (name) {
    case 'translatex':
      return `translate(${args[0]},0)`;
    case 'translatey':
      return `translate(0,${args[0]})`;
    case 'translate':
      return `translate(${args[0]},${args[1] ?? '0'})`;
    case 'scalex':
      return `scale(${args[0]},1)`;
    case 'scaley':
      return `scale(1,${args[0]})`;
    case 'scale':
      return `scale(${args[0]},${args[1] ?? args[0]})`;
    case 'rotatez':
      return `rotate(${args.join(',')})`;
    case 'skewx':
      return `skew(${args[0]},0)`;
    case 'skewy':
      return `skew(0,${args[0]})`;
    case 'skew':
      return `skew(${args[0]},${args[1] ?? '0'})`;
    case 'rotate':
    case 'rotatex':
    case 'rotatey':
    case 'translatez':
    case 'translate3d':
    case 'scalez':
    case 'scale3d':
    case 'matrix':
    case 'matrix3d':
      return `${name}(${args.join(',')})`;
    default:
      // Other functions need a computed transform evaluation.
      return undefined;
  }
}

export function normalizedSpatial(property: string, value: string): string | undefined {
  const nodes = valueParser(value).nodes.filter(
    (node: valueParser.Node): boolean => node.type !== 'space' && node.type !== 'comment',
  );
  const parts = nodes.map((node: valueParser.Node): string | undefined => {
    if (node.type !== 'function') {
      return normalizedWord(node.value);
    }
    const name = node.value.toLowerCase();
    const args = node.nodes
      .filter((arg: valueParser.Node): boolean => arg.type === 'word')
      .map((arg: valueParser.Node): string => normalizedWord(arg.value));
    return normalizedTransform(name, args);
  });
  if (parts.includes(undefined)) {
    return undefined;
  }
  const normalized = parts.filter(Boolean).join(' ');
  if (/^(inherit|revert|revert-layer|auto)$/.test(normalized)) {
    return undefined;
  }
  if (!transformProperties.has(property)) {
    return /^(initial|unset)$/.test(normalized) ? undefined : normalized;
  }
  if (!normalized || /^(none|initial|unset)$/.test(normalized)) {
    return 'identity';
  }
  const words = normalized.split(/\s+/);
  const expected = property === 'scale' ? '1' : '0';
  if (property !== 'transform' && words.every((word: string): boolean => word === expected)) {
    return 'identity';
  }
  if (property === 'rotate' && words.at(-1) === '0') {
    return 'identity';
  }
  return normalized;
}

export function spatialChanges(values: Iterable<string>): boolean {
  const known = new Set(values);
  if (known.size < 2) {
    return false;
  }
  if ([...known].some((value: string): boolean => /\bmatrix(?:3d)?\(/.test(value))) {
    // Different matrices establish motion, but comparing a matrix with another
    // representation requires evaluation. Identity is equivalent in either form.
    const representations = new Set(
      [...known]
        .filter((value: string): boolean => value !== 'identity')
        .map((value: string): string => value.replace(/\([^()]*\)/g, '()')),
    );
    return representations.size === 1;
  }
  return true;
}
