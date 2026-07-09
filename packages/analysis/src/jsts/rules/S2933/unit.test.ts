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
const SINGLE_GROUPED_MESSAGE = 'Mark this member as `readonly`.';

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
    // The class has a constructor, but the grouped issue still anchors on the class name.
    assert.ok('loc' in reports[0]);
    assert.deepEqual(reports[0].loc, loc(1, 6, 1, 7));

    const fix = reports[0].fix!(fixer);
    assert.deepEqual(fix, [
      { range: [12, 12], text: 'readonly ' },
      { range: [26, 26], text: 'readonly ' },
    ]);
  });

  it('sorts combined fixes and drops overlaps that ESLint would reject', () => {
    const foo = member('foo', loc(2, 2, 2, 5), [10, 16]);
    const bar = member('bar', loc(3, 2, 3, 5), [14, 20]);
    const baz = member('baz', loc(4, 2, 4, 5), [22, 25]);
    const reports = lintClass(
      classNode({
        members: [foo, bar, baz],
      }),
      () => [
        // `baz` precedes `foo`/`bar` by range and must be reordered; `bar` overlaps
        // `foo` (14 < 16) and must be dropped so the combined fix stays mergeable.
        readonlyReport(baz, () => ({ range: [22, 25], text: 'C' })),
        readonlyReport(foo, () => ({ range: [10, 16], text: 'A' })),
        readonlyReport(bar, () => ({ range: [14, 20], text: 'B' })),
      ],
    );

    assert.equal(reports.length, 1);
    const fix = reports[0].fix!(fixer);
    assert.deepEqual(fix, [
      { range: [10, 16], text: 'A' },
      { range: [22, 25], text: 'C' },
    ]);
  });

  it('reports on the class name, falling back to the class keyword for anonymous classes', () => {
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
    assert.deepEqual(anonymousReports[0].loc, loc(5, 10, 5, 15));
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

  it('re-encodes forwarded reports when a member location cannot be derived', () => {
    const foo = member('foo', loc(2, 2, 2, 5), [12, 15]);
    const unlocatableReport = {
      messageId: 'preferReadonly',
      data: { name: 'ghost' },
    } as unknown as Rule.ReportDescriptor;
    const reports = lintClass(
      classNode({
        members: [foo, constructorNode(loc(4, 2, 4, 18))],
      }),
      () => [readonlyReport(foo), unlocatableReport],
      { sonarRuntime: true },
    );

    // The unlocatable report is dropped (the linter has nothing to anchor it on),
    // and the located member is still grouped through report(), so its message
    // stays JSON-encoded and decodable under `hasSecondaries`.
    assert.equal(reports.length, 1);
    assert.ok('loc' in reports[0]);
    assert.deepEqual(reports[0].loc, loc(1, 6, 1, 7));
    assert.equal(typeof reports[0].fix, 'function');

    const data = reports[0].data as { sonarRuntimeData: string };
    const encoded = JSON.parse(data.sonarRuntimeData) as EncodedMessage;
    assert.equal(encoded.message, SINGLE_GROUPED_MESSAGE);
    assert.deepEqual(encoded.secondaryLocations, [
      {
        line: 2,
        column: 2,
        endLine: 2,
        endColumn: 5,
        message: "Member 'foo' is never reassigned; mark it as `readonly`.",
      },
    ]);
  });

  it('groups reports emitted by an upstream rule without depending on its listener selector', () => {
    const foo = member('foo', loc(2, 2, 2, 5), [12, 15]);
    const bar = member('bar', loc(3, 2, 3, 5), [19, 22]);
    const klass = classNode({ members: [foo, bar] });
    attachParents(klass);

    const reports = lintProgram([klass], () => [readonlyReport(foo), readonlyReport(bar)], {
      sonarRuntime: true,
    });

    assert.equal(reports.length, 1);
    assert.ok('loc' in reports[0]);
    assert.deepEqual(reports[0].loc, klass.id!.loc);
    const data = reports[0].data as { sonarRuntimeData: string };
    const encoded = JSON.parse(data.sonarRuntimeData) as EncodedMessage;
    assert.equal(encoded.message, GROUPED_MESSAGE);
    assert.deepEqual(encoded.secondaryLocations, [
      {
        line: 2,
        column: 2,
        endLine: 2,
        endColumn: 5,
        message: "Member 'foo' is never reassigned; mark it as `readonly`.",
      },
      {
        line: 3,
        column: 2,
        endLine: 3,
        endColumn: 5,
        message: "Member 'bar' is never reassigned; mark it as `readonly`.",
      },
    ]);
  });

  it('groups loc-only upstream reports by containing class', () => {
    const foo = member('foo', loc(2, 2, 2, 5), [12, 15]);
    const klass = classNode({ members: [foo] });
    attachParents(klass);

    const reports = lintProgram(
      [klass],
      () => [
        {
          loc: foo.loc,
          messageId: 'preferReadonly',
          data: { name: 'foo' },
          fix: defaultReadonlyFix(foo),
        },
      ],
      { sonarRuntime: true },
    );

    assert.equal(reports.length, 1);
    assert.deepEqual((reports[0] as { loc: AST.SourceLocation }).loc, klass.id!.loc);
    assert.deepEqual(secondaryLocations(reports[0]), [
      {
        line: 2,
        column: 2,
        endLine: 2,
        endColumn: 5,
        message: "Member 'foo' is never reassigned; mark it as `readonly`.",
      },
    ]);
  });

  it('reports grouped issues in source order', () => {
    const firstMember = member('first', loc(2, 2, 2, 7), [12, 17]);
    const secondMember = member('second', loc(8, 2, 8, 8), [80, 86]);
    const firstClass = classNode({
      id: identifier('First', loc(1, 6, 1, 11)),
      loc: loc(1, 0, 4, 1),
      members: [firstMember],
    });
    firstClass.range = [0, 40];
    firstClass.body.range = [8, 40];
    const secondClass = classNode({
      id: identifier('Second', loc(7, 6, 7, 12)),
      loc: loc(7, 0, 10, 1),
      members: [secondMember],
    });
    secondClass.range = [70, 110];
    secondClass.body.range = [78, 110];
    attachParents(firstClass);
    attachParents(secondClass);

    const reports = lintProgram([firstClass, secondClass], () => [
      readonlyReport(secondMember),
      readonlyReport(firstMember),
    ]);

    assert.equal(reports.length, 2);
    assert.deepEqual((reports[0] as { loc: AST.SourceLocation }).loc, firstClass.id!.loc);
    assert.deepEqual((reports[1] as { loc: AST.SourceLocation }).loc, secondClass.id!.loc);
  });

  it('groups nested class members under the nearest owning class', () => {
    const outerMember = member('outer', loc(2, 2, 2, 7), [12, 17]);
    const innerMember = member('inner', loc(4, 4, 4, 9), [40, 45]);
    const innerClass = classNode({
      id: identifier('Inner', loc(3, 8, 3, 13)),
      loc: loc(3, 2, 6, 3),
      members: [innerMember],
    });
    innerClass.range = [30, 60];
    innerClass.body.range = [38, 60];
    const outerClass = classNode({
      id: identifier('Outer', loc(1, 6, 1, 11)),
      loc: loc(1, 0, 7, 1),
      members: [outerMember, innerClass as unknown as TSESTree.ClassElement],
    });
    outerClass.range = [0, 80];
    outerClass.body.range = [8, 80];
    attachParents(outerClass);
    attachParents(innerClass);
    innerClass.parent = outerClass.body;

    const reports = lintProgram([outerClass], () => [
      readonlyReport(outerMember),
      readonlyReport(innerMember),
    ]);

    assert.equal(reports.length, 2);
    assert.deepEqual((reports[0] as { loc: AST.SourceLocation }).loc, outerClass.id!.loc);
    assert.deepEqual((reports[1] as { loc: AST.SourceLocation }).loc, innerClass.id!.loc);
  });

  it('groups loc-only nested class reports under the nearest owning class', () => {
    const outerMember = member('outer', loc(2, 2, 2, 7), [12, 17]);
    const innerMember = member('inner', loc(4, 4, 4, 9), [40, 45]);
    const innerClass = classNode({
      id: identifier('Inner', loc(3, 8, 3, 13)),
      loc: loc(3, 2, 6, 3),
      members: [innerMember],
    });
    innerClass.range = [30, 60];
    innerClass.body.range = [38, 60];
    const outerClass = classNode({
      id: identifier('Outer', loc(1, 6, 1, 11)),
      loc: loc(1, 0, 7, 1),
      members: [outerMember, innerClass as unknown as TSESTree.ClassElement],
    });
    outerClass.range = [0, 80];
    outerClass.body.range = [8, 80];
    attachParents(outerClass);
    attachParents(innerClass);
    innerClass.parent = outerClass.body;

    const reports = lintProgram(
      [outerClass],
      () => [
        {
          loc: outerMember.loc,
          messageId: 'preferReadonly',
          data: { name: 'outer' },
          fix: defaultReadonlyFix(outerMember),
        },
        {
          loc: innerMember.loc,
          messageId: 'preferReadonly',
          data: { name: 'inner' },
          fix: defaultReadonlyFix(innerMember),
        },
      ],
      { sonarRuntime: true },
    );

    assert.equal(reports.length, 2);
    assert.deepEqual((reports[0] as { loc: AST.SourceLocation }).loc, outerClass.id!.loc);
    assert.deepEqual((reports[1] as { loc: AST.SourceLocation }).loc, innerClass.id!.loc);
  });

  it('forwards reports transparently when no owning class can be found', () => {
    const orphan = member('orphan', loc(2, 2, 2, 8), [12, 18]);
    const reports = lintProgram([], () => [readonlyReport(orphan)], { sonarRuntime: true });

    assert.equal(reports.length, 1);
    assert.ok('loc' in reports[0]);
    assert.deepEqual(reports[0].loc, orphan.loc);
    const data = reports[0].data as { sonarRuntimeData: string };
    const encoded = JSON.parse(data.sonarRuntimeData) as EncodedMessage;
    assert.equal(encoded.message, "Member 'orphan' is never reassigned; mark it as `readonly`.");
  });

  it('preserves every edit produced by upstream per-member fixes', () => {
    const foo = member('foo', loc(2, 2, 2, 5), [12, 15]);
    const bar = member('bar', loc(3, 2, 3, 5), [30, 33]);
    const klass = classNode({ members: [foo, bar] });
    attachParents(klass);

    const reports = lintProgram([klass], () => [
      readonlyReport(foo, fixer => [
        fixer.insertTextBefore(foo as Rule.Node, 'readonly '),
        fixer.insertTextAfter(foo.key as Rule.Node, ': string'),
      ]),
      readonlyReport(bar, fixer => fixer.insertTextBefore(bar as Rule.Node, 'readonly ')),
    ]);

    assert.equal(reports.length, 1);
    const fix = reports[0].fix!(fixer);
    assert.deepEqual(fix, [
      { range: [0, 0], text: ': string' },
      { range: [12, 12], text: 'readonly ' },
      { range: [30, 30], text: 'readonly ' },
    ]);
  });

  it('preserves an upstream listener registered on the same class selector', () => {
    const klass = classNode({ members: [] });
    attachParents(klass);
    let upstreamClassListenerCalls = 0;
    const reports: Rule.ReportDescriptor[] = [];
    const upstreamRule: Rule.RuleModule = {
      meta: { type: 'suggestion', fixable: 'code', messages: {} },
      create() {
        return {
          'ClassDeclaration, ClassExpression'() {
            upstreamClassListenerCalls++;
          },
        };
      },
    };

    const listener = decorate(upstreamRule).create(ruleContext(reports));

    const onClass = listener['ClassDeclaration, ClassExpression'] as (node: ClassNode) => void;
    onClass(klass);

    assert.equal(upstreamClassListenerCalls, 1);
    assert.equal(reports.length, 0);
  });
});

function lintClass(
  node: ClassNode,
  reportsForClass: (node: ClassNode) => Rule.ReportDescriptor[],
  settings: Record<string, unknown> = {},
) {
  attachParents(node);
  return lintProgram([node], () => reportsForClass(node), settings);
}

function lintProgram(
  classes: ClassNode[],
  reportsForProgram: () => Rule.ReportDescriptor[],
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
        Program() {
          for (const report of reportsForProgram()) {
            context.report(report);
          }
        },
      };
    },
  };

  const listener = decorate(upstreamRule).create(ruleContext(reports, settings));

  if (typeof listener.Program === 'function') {
    listener.Program(program(classes));
  }

  const onClass = listener['ClassDeclaration, ClassExpression'] as
    ((node: ClassNode) => void) | undefined;
  if (typeof onClass === 'function') {
    for (const classNode of classes) {
      visitClasses(classNode, onClass);
    }
  }

  if (typeof listener['Program:exit'] === 'function') {
    listener['Program:exit'](program(classes));
  }

  return reports;
}

function ruleContext(
  reports: Rule.ReportDescriptor[],
  settings: Record<string, unknown> = {},
): Rule.RuleContext {
  return {
    report(reportDescriptor: Rule.ReportDescriptor) {
      reports.push(reportDescriptor);
    },
    sourceCode: {
      getIndexFromLoc(position: { line: number; column: number }) {
        return position.line * 10 + position.column;
      },
      getFirstToken(node: TSESTree.Node, predicate?: (token: AST.Token) => boolean) {
        const classToken = {
          type: 'Keyword',
          value: 'class',
          loc: loc(
            node.loc!.start.line,
            node.loc!.start.column,
            node.loc!.start.line,
            node.loc!.start.column + 5,
          ),
          range: [node.range![0], node.range![0] + 5] as AST.Range,
        } as AST.Token;
        return (predicate?.(classToken) ?? true) ? classToken : null;
      },
    },
    settings,
  } as Rule.RuleContext;
}

function program(classes: ClassNode[]): ProgramNode {
  return {
    type: AST_NODE_TYPES.Program,
    body: classes,
    sourceType: 'module',
    loc: loc(1, 0, 10, 0),
    range: [0, 100],
  } as unknown as ProgramNode;
}

function visitClasses(node: ClassNode, onClass: (node: ClassNode) => void) {
  onClass(node);
  for (const memberNode of node.body.body as unknown as TSESTree.Node[]) {
    if (
      memberNode.type === AST_NODE_TYPES.ClassDeclaration ||
      memberNode.type === AST_NODE_TYPES.ClassExpression
    ) {
      visitClasses(memberNode, onClass);
    }
  }
}

function attachParents(node: ClassNode) {
  node.body.parent = node;
  for (const memberNode of node.body.body) {
    memberNode.parent = node.body;
    if ('key' in memberNode && memberNode.key) {
      memberNode.key.parent = memberNode;
    }
    if (memberNode.type === AST_NODE_TYPES.PropertyDefinition && memberNode.value) {
      memberNode.value.parent = memberNode;
    }
  }
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
  insertTextAfter(node: Rule.Node, text: string) {
    return {
      range: [node.range![1], node.range![1]] as AST.Range,
      text,
    };
  },
} as Rule.RuleFixer;

type ClassNode = TSESTree.ClassDeclaration | TSESTree.ClassExpression;
type ProgramListener = NonNullable<Rule.RuleListener['Program']>;
type ProgramNode = Parameters<ProgramListener>[0];

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
