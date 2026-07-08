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
import { expect } from 'expect';
import type estree from 'estree';
import { parseForESLint } from '@typescript-eslint/parser';
import ts from 'typescript';
import { createProgramFromSingleFile } from '../../../../src/jsts/program/factory.js';
import {
  followCallToDeclaration,
  followCallToImplementation,
  followReferenceToDeclaration,
} from '../../../../src/jsts/rules/helpers/call-to-declaration.js';
import type { RequiredParserServices } from '../../../../src/jsts/rules/helpers/parser-services.js';

describe('call-to-declaration', () => {
  it('resolves direct function calls to their declaration', () => {
    const { services, sourceFile, call } = createProgramFromSource(`
      function helper() {
        return true;
      }

      helper();
    `);

    if (!call) {
      throw new Error('Expected helper call expression to exist');
    }
    const declaration = followCallToDeclaration(call, services);

    expect(declaration?.getText(sourceFile)).toContain('function helper()');
  });

  it('resolves typed function value calls to their implementation', () => {
    const { services, sourceFile, call } = createProgramFromSource(`
      type Helper = () => void;

      const helper: Helper = () => {
        return;
      };

      helper();
    `);

    if (!call) {
      throw new Error('Expected helper call expression to exist');
    }
    const declaration = followCallToDeclaration(call, services);
    const implementation = followCallToImplementation(call, services);

    expect(declaration?.getText(sourceFile)).toBe('() => void');
    expect(implementation?.getText(sourceFile)).toContain('return;');
  });

  it('resolves identifier references to function-valued variable declarations', () => {
    const { services, sourceFile, identifier } = createProgramFromSource(`
      type Helper = () => void;

      const helper: Helper = () => {
        return;
      };

      use(helper);
    `);

    if (!identifier) {
      throw new Error('Expected helper identifier to exist');
    }
    const declaration = followReferenceToDeclaration(identifier, services);

    expect(declaration?.getText(sourceFile)).toContain('return;');
  });

  it('resolves typed object member calls to their implementation', () => {
    const { services, sourceFile, call } = createProgramFromSource(`
      type Helper = () => void;

      const helpers: { check: Helper } = {
        check: () => {
          return;
        },
      };

      helpers.check();
    `);

    if (!call) {
      throw new Error('Expected helper call expression to exist');
    }
    const declaration = followCallToDeclaration(call, services);
    const implementation = followCallToImplementation(call, services);

    expect(declaration?.getText(sourceFile)).toBe('() => void');
    expect(implementation?.getText(sourceFile)).toContain('return;');
  });

  it('does not trust mutable typed function value initializers as implementations', () => {
    const { services, sourceFile, call } = createProgramFromSource(`
      type Helper = () => void;

      let helper: Helper = () => {
        return;
      };
      helper = () => {};

      helper();
    `);

    if (!call) {
      throw new Error('Expected helper call expression to exist');
    }
    const implementation = followCallToImplementation(call, services);

    expect(implementation?.getText(sourceFile)).toBe('() => void');
  });
});

function createProgramFromSource(sourceCode: string): {
  services: RequiredParserServices;
  sourceFile: ts.SourceFile;
  call: estree.CallExpression | undefined;
  identifier: estree.Identifier | undefined;
} {
  const fileName = 'call-to-declaration.test.ts';
  const program = createProgramFromSingleFile(fileName, sourceCode);
  const parseResult = parseForESLint(sourceCode, {
    loc: true,
    range: true,
    tokens: true,
    comment: true,
    ecmaVersion: 2020,
    sourceType: 'module',
    programs: [program],
    filePath: fileName,
  });
  const sourceFile = program.getSourceFile(fileName);
  if (!sourceFile) {
    throw new Error('Expected source file to exist');
  }

  const call = findESTreeNode(
    parseResult.ast as estree.Node,
    node =>
      node.type === 'CallExpression' &&
      ((node.callee.type === 'Identifier' && node.callee.name === 'helper') ||
        (node.callee.type === 'MemberExpression' &&
          !node.callee.computed &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'check')),
  ) as estree.CallExpression | undefined;

  const referenceStart = sourceCode.indexOf('use(helper)');
  const identifier = findESTreeNode(
    parseResult.ast as estree.Node,
    node =>
      node.type === 'Identifier' &&
      node.name === 'helper' &&
      referenceStart !== -1 &&
      node.range !== undefined &&
      node.range[0] > referenceStart,
  ) as estree.Identifier | undefined;
  return {
    services: parseResult.services as RequiredParserServices,
    sourceFile,
    call,
    identifier,
  };
}

function findESTreeNode(
  node: estree.Node,
  predicate: (node: estree.Node) => boolean,
): estree.Node | undefined {
  if (predicate(node)) {
    return node;
  }

  for (const key of Object.keys(node) as Array<keyof estree.Node>) {
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (isNode(item)) {
          const found = findESTreeNode(item, predicate);
          if (found) {
            return found;
          }
        }
      }
    } else if (isNode(child)) {
      const found = findESTreeNode(child, predicate);
      if (found) {
        return found;
      }
    }
  }

  return undefined;
}

function isNode(value: unknown): value is estree.Node {
  return typeof value === 'object' && value !== null && 'type' in value;
}
