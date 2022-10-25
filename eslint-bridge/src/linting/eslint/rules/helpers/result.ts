/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { Node } from 'estree';
import {
  getProperty,
  getUniqueWriteUsageOrNode,
  isArrayExpression,
  isStringLiteral,
  isUndefined,
} from './ast';
import { Rule } from 'eslint';
import { StringLiteral } from './aws/iam';

export class Result {
  constructor(
    readonly ctx: Rule.RuleContext,
    readonly node: Node,
    readonly status: 'missing' | 'unknown' | 'found',
  ) {}

  get isFound() {
    return this.status === 'found';
  }

  get isMissing() {
    return this.status === 'missing';
  }

  getArgument(position: number): Result {
    if (!this.isFound) {
      return this;
    } else if (this.node.type !== 'NewExpression' && this.node.type !== 'CallExpression') {
      return unknown(this.ctx, this.node);
    }

    const argument = this.node.arguments[position];
    if (argument == null) {
      return missing(this.ctx, this.node);
    } else {
      return getResultOfExpression(this.ctx, argument);
    }
  }

  getProperty(propertyName: string): Result {
    if (!this.isFound) {
      return this;
    } else if (this.node.type !== 'ObjectExpression') {
      return unknown(this.ctx, this.node);
    }

    const property = getProperty(this.node, propertyName, this.ctx);
    if (property === undefined) {
      return unknown(this.ctx, this.node);
    } else if (property === null) {
      return missing(this.ctx, this.node);
    } else {
      return getResultOfExpression(this.ctx, property.value);
    }
  }

  everyStringLiteral(closure: (item: StringLiteral) => boolean) {
    if (!this.isFound) {
      return false;
    } else if (isStringLiteral(this.node)) {
      return closure(this.node);
    } else if (this.node.type !== 'ArrayExpression') {
      return false;
    }

    for (const element of this.node.elements) {
      if (element == null || element.type === 'SpreadElement') {
        return false;
      }

      const child = getResultOfExpression(this.ctx, element);
      if (!child.isFound || !isStringLiteral(child.node) || !closure(child.node)) {
        return false;
      }
    }

    return true;
  }

  asStringLiterals() {
    if (!this.isFound) {
      return [];
    }

    const values: StringLiteral[] = [];

    if (isArrayExpression(this.node)) {
      for (const arg of this.node.elements) {
        const result = arg == null ? null : getResultOfExpression(this.ctx, arg);
        if (result?.isFound && isStringLiteral(result.node)) {
          values.push(result.node);
        }
      }
    } else if (isStringLiteral(this.node)) {
      values.push(this.node);
    }

    return values;
  }

  map<N extends Node, V>(closure: (node: N) => V | null): V | null {
    return !this.isFound ? null : closure(this.node as N);
  }

  filter<N extends Node>(closure: (node: N) => boolean): Result {
    if (!this.isFound) {
      return this;
    }
    return !closure(this.node as N) ? unknown(this.ctx, this.node) : this;
  }
}

function unknown(ctx: Rule.RuleContext, node: Node): Result {
  return new Result(ctx, node, 'unknown');
}

function missing(ctx: Rule.RuleContext, node: Node): Result {
  return new Result(ctx, node, 'missing');
}

function found(ctx: Rule.RuleContext, node: Node): Result {
  return new Result(ctx, node, 'found');
}

export function getResultOfExpression(ctx: Rule.RuleContext, node: Node): Result {
  if (isUndefined(node)) {
    return missing(ctx, node);
  } else {
    const value = getUniqueWriteUsageOrNode(ctx, node);
    return value === node ? found(ctx, node) : getResultOfExpression(ctx, value);
  }
}
