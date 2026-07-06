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
import { parseForESLint } from '@typescript-eslint/parser';
import ts from 'typescript';
import { isTSAssertion } from '../../../../src/jsts/rules/helpers/assertion-detection.js';
import type { RequiredParserServices } from '../../../../src/jsts/rules/helpers/parser-services.js';
import { createProgramFromSingleFile } from '../../../../src/jsts/program/factory.js';

describe('assertion-detection', () => {
  it('recognizes TypeScript chai should chains ending in properties or calls', () => {
    const sourceCode = `
      import chai from 'chai';

      const user = { pets: ['cat', 'dog', 'bird', 'fish'] };
      user.should.have.property('pets').with.lengthOf(4);

      const warning = { isVisible: () => true };
      warning.isVisible().should.be.true;

      const status = true;
      status.should.to.be.be.true;

      const payload = {};
      payload.should.exist;

      const submitPassword = { should: { have: { been: { calledWith: () => {} } } } };
      submitPassword.should.have.been.calledWith('secret');
    `;

    const { services, program } = createProgramFromSource(sourceCode);

    expect(isTSAssertion(services, findTSNodeByText(program, 'user.should'))).toEqual(true);
    expect(
      isTSAssertion(services, findTSNodeByText(program, 'warning.isVisible().should')),
    ).toEqual(true);
    expect(isTSAssertion(services, findTSNodeByText(program, 'status.should'))).toEqual(true);
    expect(isTSAssertion(services, findTSNodeByText(program, 'payload.should'))).toEqual(true);
    expect(isTSAssertion(services, findTSNodeByText(program, 'submitPassword.should'))).toEqual(
      true,
    );
  });

  it('rejects incomplete or unknown TypeScript chai should chains', () => {
    const sourceCode = `
      import chai from 'chai';

      declare global {
        interface Object {
          should: any;
        }
      }

      const bare = {};
      bare.should;

      const incomplete = true;
      incomplete.should.to.be;

      const unknown = {};
      unknown.should.eventually;

      const terminalFollowed = {};
      terminalFollowed.should.exist.and;
    `;

    const { services, program } = createProgramFromSource(sourceCode);

    expect(isTSAssertion(services, findTSNodeByText(program, 'bare.should'))).toEqual(false);
    expect(isTSAssertion(services, findTSNodeByText(program, 'incomplete.should'))).toEqual(false);
    expect(isTSAssertion(services, findTSNodeByText(program, 'unknown.should'))).toEqual(false);
    expect(isTSAssertion(services, findTSNodeByText(program, 'terminalFollowed.should'))).toEqual(
      false,
    );
  });
});

function createProgramFromSource(sourceCode: string): {
  services: RequiredParserServices;
  program: ts.Program;
} {
  const fileName = 'assertion-detection.test.ts';
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

  return {
    services: parseResult.services as RequiredParserServices,
    program,
  };
}

function findTSNodeByText(program: ts.Program, text: string): ts.Node {
  const sourceFile = program.getSourceFile('assertion-detection.test.ts');
  if (!sourceFile) {
    throw new Error('Expected source file to exist');
  }

  const found = findTSNode(sourceFile, node => node.getText(sourceFile) === text);
  if (!found) {
    throw new Error(`Expected to find TS node for: ${text}`);
  }
  return found;
}

function findTSNode(node: ts.Node, predicate: (node: ts.Node) => boolean): ts.Node | undefined {
  if (predicate(node)) {
    return node;
  }

  let found: ts.Node | undefined;
  node.forEachChild(child => {
    found ??= findTSNode(child, predicate);
  });
  return found;
}
