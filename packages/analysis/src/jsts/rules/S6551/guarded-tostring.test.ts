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
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import parser from '@typescript-eslint/parser';
import type { Rule, SourceCode } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import type { Node } from 'estree';
import { parse } from '../../parsers/parse.js';
import type { Parser } from '../../parsers/eslint.js';
import { childrenOf } from '../helpers/ancestor.js';
import { isGuardedDirectToStringCall } from './helpers/guarded-tostring.js';

describe('S6551 guarded toString helper', () => {
  it('recognizes direct calls guarded by a custom toString comparison', () => {
    const { reportDescriptor, context } = guardedToStringReport(`
function render(value: object) {
  if (value.toString !== Object.prototype.toString) {
    return value.toString();
  }

  return undefined;
}
    `);

    assert.equal(isGuardedDirectToStringCall(reportDescriptor, context), true);
  });

  it('recognizes captured results validated against the default object string', () => {
    const { reportDescriptor, context } = guardedToStringReport(
      `
function render(data: unknown) {
  if (data && typeof data === 'object' && typeof data.toString === 'function') {
    const rendered = data.toString();
    if (rendered !== '[object Object]') {
      return rendered;
    }
  }

  return data;
}
    `,
      'data.toString()',
    );

    assert.equal(isGuardedDirectToStringCall(reportDescriptor, context), true);
  });

  it('rejects validated results that are used again after the guard', () => {
    const { reportDescriptor, context } = guardedToStringReport(
      `
function render(data: unknown) {
  if (data && typeof data === 'object' && typeof data.toString === 'function') {
    const rendered = data.toString();
    if (rendered !== '[object Object]') {
      return rendered;
    }
    console.log(rendered);
  }

  return data;
}
    `,
      'data.toString()',
    );

    assert.equal(isGuardedDirectToStringCall(reportDescriptor, context), false);
  });
});

function guardedToStringReport(code: string, callText = 'value.toString()') {
  const sourceCode = parse(code, parser as Parser, {
    ecmaVersion: 2022,
    sourceType: 'module',
  }).sourceCode;
  attachParents(sourceCode.ast as TSESTree.Program, sourceCode);

  const call = findCallExpression(sourceCode, callText);
  const reportDescriptor: Rule.ReportDescriptor = {
    node: call as unknown as Node,
    messageId: 'baseToString',
  };

  return {
    reportDescriptor,
    context: { sourceCode } as Rule.RuleContext,
  };
}

function findCallExpression(sourceCode: SourceCode, callText: string): TSESTree.CallExpression {
  const queue: TSESTree.Node[] = [sourceCode.ast as TSESTree.Program];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (
      current.type === 'CallExpression' &&
      sourceCode.getText(current as unknown as Node) === callText
    ) {
      return current;
    }
    queue.push(
      ...childrenOf(current as unknown as Node, sourceCode.visitorKeys).map(
        child => child as unknown as TSESTree.Node,
      ),
    );
  }

  throw new Error(`Could not find call expression: ${callText}`);
}

function attachParents(root: TSESTree.Node, sourceCode: SourceCode) {
  const queue: TSESTree.Node[] = [root];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const child of childrenOf(current as unknown as Node, sourceCode.visitorKeys)) {
      const childNode = child as unknown as TSESTree.Node;
      childNode.parent = current;
      queue.push(childNode);
    }
  }
}
