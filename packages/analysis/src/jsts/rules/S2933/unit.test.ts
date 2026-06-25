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
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { AST, Rule } from 'eslint';
import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';
import { decorate } from './decorator.js';
import type { EncodedMessage } from '../helpers/location.js';

const GROUPED_MESSAGE = 'Mark these members as `readonly`.';

describe('S2933 decorator', () => {
  it('keeps aggregate quick fixes when one member fix cannot be produced', () => {
    const foo = member('foo', loc(2, 2, 2, 5), [12, 15]);
    const bar = member('bar', loc(3, 2, 3, 5), [19, 22]);
    const baz = member('baz', loc(4, 2, 4, 5), [26, 29]);
    const reports = lintClass(
      classNode({
        members: [foo, bar, baz, constructorNode(loc(6, 2, 6, 18))],
      }),
      () => [readonlyReport(foo), readonlyReport(bar, () => null), readonlyReport(baz)],
    );

    assert.equal(reports.length, 1);
    assert.ok('message' in reports[0]);
    assert.equal(reports[0].message, GROUPED_MESSAGE);

    const fix = reports[0].fix!(fixer);
    assert.deepEqual(fix, [
      { range: [12, 12], text: 'readonly ' },
      { range: [26, 26], text: 'readonly ' },
    ]);
  });

  it('reports constructor-less classes on the class name or class keyword', () => {
    const namedMember = member('foo', loc(2, 2, 2, 5), [12, 15]);
    const namedClass = classNode({
      id: identifier('NamedClass', loc(1, 6, 1, 16)),
      members: [namedMember],
    });

    const namedReports = lintClass(namedClass, () => [readonlyReport(namedMember)], {
      sonarRuntime: true,
    });

    assert.ok('loc' in namedReports[0]);
    assert.deepEqual(namedReports[0].loc, namedClass.id!.loc);
    assert.deepEqual(secondaryLocations(namedReports[0]), [
      {
        line: 2,
        column: 2,
        endLine: 2,
        endColumn: 5,
        message: "Member 'foo' is never reassigned; mark it as `readonly`.",
      },
    ]);

    const anonymousMember = member('bar', loc(6, 4, 6, 7), [56, 59]);
    const anonymousClass = classNode({
      type: AST_NODE_TYPES.ClassExpression,
      id: null,
      loc: loc(5, 10, 7, 1),
      members: [anonymousMember],
    });

    const anonymousReports = lintClass(anonymousClass, () => [readonlyReport(anonymousMember)], {
      sonarRuntime: true,
    });

    assert.ok('loc' in anonymousReports[0]);
    assert.deepEqual(anonymousReports[0].loc, anonymousClass.loc);
    assert.deepEqual(secondaryLocations(anonymousReports[0]), [
      {
        line: 6,
        column: 4,
        endLine: 6,
        endColumn: 7,
        message: "Member 'bar' is never reassigned; mark it as `readonly`.",
      },
    ]);
  });

  it('forwards original reports when a secondary location cannot be derived', () => {
    const foo = member('foo', loc(2, 2, 2, 5), [12, 15]);
    const firstReport = readonlyReport(foo);
    const unlocatableReport = {
      message: 'upstream report without a usable location',
    } as Rule.ReportDescriptor;
    const reports = lintClass(
      classNode({
        members: [foo, constructorNode(loc(4, 2, 4, 18))],
      }),
      () => [firstReport, unlocatableReport],
    );

    assert.deepEqual(reports, [firstReport, unlocatableReport]);
  });
});

function lintClass(
  node: ClassNode,
  reportsForClass: (node: ClassNode) => Rule.ReportDescriptor[],
  settings: Record<string, unknown> = {},
) {
  const reports: Rule.ReportDescriptor[] = [];
  const upstreamRule: Rule.RuleModule = {
    meta: {
      type: 'suggestion',
      fixable: 'code',
      messages: {
        preferReadonly: "Member '{{name}}' is never reassigned; mark it as `readonly`.",
      },
    },
    create(context) {
      return {
        'ClassDeclaration, ClassExpression:exit'(classNode: ClassNode) {
          for (const report of reportsForClass(classNode)) {
            context.report(report);
          }
        },
      };
    },
  };

  const listener = decorate(upstreamRule).create({
    report(reportDescriptor: Rule.ReportDescriptor) {
      reports.push(reportDescriptor);
    },
    settings,
  } as Rule.RuleContext);
  const onClassExit = listener['ClassDeclaration, ClassExpression:exit'] as (
    node: ClassNode,
  ) => void;
  onClassExit(node);
  return reports;
}

function secondaryLocations(report: Rule.ReportDescriptor) {
  const data = report.data as { sonarRuntimeData: string };
  return (JSON.parse(data.sonarRuntimeData) as EncodedMessage).secondaryLocations;
}

function readonlyReport(
  node: TSESTree.Node,
  fix: Rule.ReportFixer | null = defaultReadonlyFix(node),
): Rule.ReportDescriptor {
  const name =
    node.type === 'PropertyDefinition' && node.key.type === 'Identifier'
      ? node.key.name
      : node.type;

  return {
    node: node as Rule.Node,
    messageId: 'preferReadonly',
    data: {
      name,
    },
    ...(fix && { fix }),
  };
}

function defaultReadonlyFix(node: TSESTree.Node): Rule.ReportFixer {
  return fixer => fixer.insertTextBefore(node as Rule.Node, 'readonly ');
}

const fixer = {
  insertTextBefore(node: Rule.Node, text: string) {
    return {
      range: [node.range![0], node.range![0]] as AST.Range,
      text,
    };
  },
} as Rule.RuleFixer;

type ClassNode = TSESTree.ClassDeclaration | TSESTree.ClassExpression;

function classNode({
  type = AST_NODE_TYPES.ClassDeclaration,
  id = identifier('A', loc(1, 6, 1, 7)),
  loc: location = loc(1, 0, 7, 1),
  members,
}: {
  type?: ClassNode['type'];
  id?: TSESTree.Identifier | null;
  loc?: AST.SourceLocation;
  members: TSESTree.ClassElement[];
}): ClassNode {
  return {
    type,
    id,
    body: {
      type: 'ClassBody',
      body: members,
      loc: location,
      range: [0, 100],
    },
    loc: location,
    range: [0, 100],
  } as ClassNode;
}

function constructorNode(location: AST.SourceLocation): TSESTree.MethodDefinition {
  return {
    type: 'MethodDefinition',
    kind: 'constructor',
    loc: location,
    range: [40, 56],
  } as TSESTree.MethodDefinition;
}

function member(
  name: string,
  location: AST.SourceLocation,
  range: AST.Range,
): TSESTree.PropertyDefinition {
  return {
    type: 'PropertyDefinition',
    key: identifier(name, location),
    loc: location,
    range,
  } as TSESTree.PropertyDefinition;
}

function identifier(name: string, location: AST.SourceLocation): TSESTree.Identifier {
  return {
    type: 'Identifier',
    name,
    loc: location,
    range: [0, 0],
  } as TSESTree.Identifier;
}

function loc(line: number, column: number, endLine = line, endColumn = column + 1) {
  return {
    start: { line, column },
    end: { line: endLine, column: endColumn },
  };
}
