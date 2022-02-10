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
import {
  decodeSonarRuntimeIssue,
  getCognitiveComplexity,
  getHighlightedSymbols,
  getRuleConfig,
  LinterWrapper,
} from 'linter';
import { Rule, SourceCode } from 'eslint';
import { setContext } from 'context';
import path from 'path';
import { parseJavaScriptSourceFile, parseTypeScriptSourceFile } from './utils/parser-utils';
import { getMessageForFix } from '../src/quickfix';

const ruleUsingSecondaryLocations = {
  meta: { schema: { enum: ['sonar-runtime'] } },
  create(_context: Rule.RuleContext) {
    return {};
  },
};

const ruleUsingContext = {
  meta: {
    schema: [
      {
        title: 'sonar-context',
        type: 'object',
        properties: {
          workDir: {
            type: 'string',
          },
        },
      },
    ],
  },
  create(_context: Rule.RuleContext) {
    return {};
  },
};

const ruleUsingContextAndSecondaryLocations = {
  meta: {
    schema: [
      {
        enum: ['sonar-runtime'],
      },
      {
        title: 'sonar-context',
        type: 'object',
        properties: {
          workDir: {
            type: 'string',
          },
        },
      },
    ],
  },
  create(_context: Rule.RuleContext) {
    return {};
  },
};

const regularRule = {
  create(_context: Rule.RuleContext) {
    return {};
  },
};

// const filePath = '/some/path/of/some/file.ts';
const filePath = path.join(__dirname, './fixtures/ts-project/sample.lint.ts');
const tsConfig = path.join(__dirname, './fixtures/ts-project/tsconfig.json');

describe('#getRuleConfig', () => {
  it("should set sonar-runtime when it's defined in the rule schema", () => {
    const config = getRuleConfig(ruleUsingSecondaryLocations, {
      key: 'ruleUsingSecondaryLocations',
      configurations: [],
      fileTypeTarget: ['MAIN'],
    });
    expect(config).toContain('sonar-runtime');
  });

  it("should not set sonar-runtime when it's not defined in the rule schema", () => {
    const config = getRuleConfig(undefined, {
      key: 'regularRule',
      configurations: [],
      fileTypeTarget: ['MAIN'],
    });
    expect(config).not.toContain('sonar-runtime');
  });

  it('should always set sonar-runtime as last option', () => {
    const config = getRuleConfig(ruleUsingSecondaryLocations, {
      key: 'ruleUsingSecondaryLocations',
      configurations: ['someOtherOption'],
      fileTypeTarget: ['MAIN'],
    });
    expect(config).toEqual(['someOtherOption', 'sonar-runtime']);
  });

  it('should log debug when rule module is not found', () => {
    console.log = jest.fn();
    const config = getRuleConfig(undefined, {
      key: 'notExistingRuleModule',
      configurations: [],
      fileTypeTarget: ['MAIN'],
    });
    expect(console.log).toHaveBeenCalledWith(
      'DEBUG ruleModule not found for rule notExistingRuleModule',
    );
    expect(config).toEqual([]);
    jest.resetAllMocks();
  });

  it('should provide context when there is sonar-context in schema', () => {
    setContext({
      workDir: '/tmp/workdir',
      shouldUseTypeScriptParserForJS: true,
      sonarlint: false,
    });
    const config = getRuleConfig(ruleUsingContext, {
      key: 'ruleUsingContext',
      configurations: [],
      fileTypeTarget: ['MAIN'],
    });
    expect(config).toEqual([
      { workDir: '/tmp/workdir', shouldUseTypeScriptParserForJS: true, sonarlint: false },
    ]);
  });

  it('should provide context and set sonar-runtime when there is sonar-context and sonar-runtime in schema', () => {
    setContext({
      workDir: '/tmp/workdir',
      shouldUseTypeScriptParserForJS: true,
      sonarlint: false,
    });
    const config = getRuleConfig(ruleUsingContextAndSecondaryLocations, {
      key: 'ruleUsingContextAndSecondaryLocations',
      configurations: ['config'],
      fileTypeTarget: ['MAIN'],
    });
    expect(config).toEqual([
      'config',
      'sonar-runtime',
      { workDir: '/tmp/workdir', shouldUseTypeScriptParserForJS: true, sonarlint: false },
    ]);
  });
});

describe('#decodeSecondaryLocations', () => {
  const issue = {
    column: 1,
    line: 1,
    ruleId: 'ruleUsingSecondaryLocations',
    secondaryLocations: [],
    message: 'Issue message',
  };

  const encodedMessage = {
    secondaryLocations: [{ column: 2, line: 2, message: 'Secondary' }],
    cost: 14,
    message: 'Issue message',
  };

  const issueWithEncodedMessage = {
    column: 1,
    line: 1,
    ruleId: 'ruleUsingSecondaryLocations',
    message: JSON.stringify(encodedMessage),
    secondaryLocations: [],
  };

  it('should not alter message coming from regular rule', () => {
    const { message } = decodeSonarRuntimeIssue(regularRule, issue);
    expect(message).toEqual(issue.message);
  });

  it('should decode message coming from rule with sonar-runtime parameter', () => {
    const decodedIssue = decodeSonarRuntimeIssue(
      ruleUsingSecondaryLocations,
      issueWithEncodedMessage,
    );
    expect(decodedIssue.secondaryLocations).toEqual(encodedMessage.secondaryLocations);
    expect(decodedIssue.cost).toEqual(encodedMessage.cost);
  });

  it('should log error when cannot parse secondary locations', () => {
    expect(() =>
      decodeSonarRuntimeIssue(ruleUsingSecondaryLocations, {
        ...issueWithEncodedMessage,
        message: 'Incorrect message',
      }),
    ).toThrowError(
      'Failed to parse encoded issue message for rule ruleUsingSecondaryLocations:\n' +
        '"Incorrect message". Unexpected token I in JSON at position 0',
    );
  });

  it('should not take into account config from comments', () => {
    const sourceCode = parseJavaScriptSourceFile(
      `
    /*eslint max-params: ["error", 1]*/
    function foo(a, b){}`,
      `foo.js`,
    ) as SourceCode;
    const linter = new LinterWrapper([]);
    const result = linter.analyze(sourceCode, filePath).issues;
    expect(result).toHaveLength(0);
  });

  it('should compute cognitive complexity and symbol highlighting', () => {
    const sourceCode = parseJavaScriptSourceFile(
      'if (true) if (true) if (true) return; let x = 42;',
      `foo.js`,
    ) as SourceCode;
    const linter = new LinterWrapper([]);
    const { cognitiveComplexity, highlightedSymbols } = linter.analyze(sourceCode, filePath);
    expect(cognitiveComplexity).toEqual(6);
    expect(highlightedSymbols).toEqual([
      {
        declaration: {
          endCol: 43,
          endLine: 1,
          startCol: 42,
          startLine: 1,
        },
        references: [],
      },
    ]);
  });

  it('should not report unused expressions when chai lib is used', () => {
    const sourceCode = parseJavaScriptSourceFile(
      `expect(true).to.be.true;
       42;`,
      `foo.js`, // we report only here
    ) as SourceCode;
    const linter = new LinterWrapper([
      { key: 'no-unused-expressions', configurations: [], fileTypeTarget: ['MAIN'] },
    ]);
    const result = linter.analyze(sourceCode, filePath).issues;
    expect(result).toHaveLength(1);
  });

  it('should not report on globals provided by environment configuration', () => {
    const sourceCode = parseJavaScriptSourceFile(`var alert = 1;`, `foo.js`) as SourceCode;
    const linter = new LinterWrapper(
      [{ key: 'declarations-in-global-scope', configurations: [], fileTypeTarget: ['MAIN'] }],
      [],
      ['browser'],
    );
    const result = linter.analyze(sourceCode, filePath).issues;
    expect(linter.linterConfig.env['browser']).toEqual(true);
    expect(result).toHaveLength(0);
  });

  it('should not report on globals provided by globals configuration', () => {
    const sourceCode = parseJavaScriptSourceFile(`var angular = 1;`, `foo.js`) as SourceCode;
    const linter = new LinterWrapper(
      [{ key: 'declarations-in-global-scope', configurations: [], fileTypeTarget: ['MAIN'] }],
      [],
      [],
      ['angular'],
    );
    const result = linter.analyze(sourceCode, filePath).issues;
    expect(linter.linterConfig.globals['angular']).toEqual(true);
    expect(result).toHaveLength(0);
  });

  it('should merge "constructor-super" with "no-this-before-super" issues', () => {
    const sourceCode = parseJavaScriptSourceFile(
      `class A extends B { constructor() {this.bar();}}
       class A extends B { constructor(a) { while (a) super(); } }`,
      `foo.js`,
    ) as SourceCode;
    const linter = new LinterWrapper(
      [{ key: 'super-invocation', configurations: [], fileTypeTarget: ['MAIN'] }],
      [],
      [],
      [],
    );
    const result = linter.analyze(sourceCode, filePath).issues;
    expect(result).toHaveLength(4);
    expect(result.every(i => i.ruleId === 'super-invocation')).toBe(true);
  });
});

describe('TypeScript ESLint rule sanitization', () => {
  setContext({
    workDir: '/tmp/workdir',
    shouldUseTypeScriptParserForJS: true,
    sonarlint: false,
  });

  const linter = new LinterWrapper(
    [{ key: 'prefer-readonly', configurations: [], fileTypeTarget: ['MAIN'] }],
    [],
    [],
    [],
  );

  const fileContent = `class C { private static f = 5; }`;

  it('when type information is available', () => {
    const sourceCode = parseTypeScriptSourceFile(fileContent, filePath, [tsConfig]) as SourceCode;
    const result = linter.analyze(sourceCode, filePath).issues;
    expect(result).toHaveLength(1);
  });

  it('when type information is missing', () => {
    const sourceCode = parseTypeScriptSourceFile(fileContent, filePath, []) as SourceCode;
    const linter = new LinterWrapper(
      [{ key: 'prefer-readonly', configurations: [], fileTypeTarget: ['MAIN'] }],
      [],
      [],
      [],
    );
    const result = linter.analyze(sourceCode, filePath).issues;
    expect(result).toHaveLength(0);
  });
});

describe('Metrics computation', () => {
  it('should return undefined for cognitive complexity when issue is not found', () => {
    expect(getCognitiveComplexity([])).toBeUndefined();
  });

  it('should return undefined for cognitive complexity when message is not numeric', () => {
    expect(
      getCognitiveComplexity([
        {
          ruleId: 'internal-cognitive-complexity',
          message: 'nan',
          column: 0,
          line: 0,
          secondaryLocations: [],
        },
      ]),
    ).toBeUndefined();
  });

  it('should return undefined with highlighted symbols when issue is not found', () => {
    expect(getHighlightedSymbols([])).toBeUndefined();
  });
});

describe('Quickfixes', () => {
  it('should provide quickfix from eslint fix', () => {
    const quickFix = getQuickFix(`var x = 5;;`, 'no-extra-semi');
    expect(quickFix).toEqual([
      {
        message: 'Remove extra semicolon',
        edits: [{ loc: { line: 1, column: 9, endLine: 1, endColumn: 11 }, text: ';' }],
      },
    ]);
  });

  it('should provide quickfix from eslint suggestions', () => {
    const quickFix = getQuickFix(`if (!5 instanceof number) f()`, 'no-unsafe-negation');
    expect(quickFix).toEqual([
      {
        message:
          "Negate 'instanceof' expression instead of its left operand. This changes the current behavior.",
        edits: [
          {
            loc: { line: 1, column: 5, endLine: 1, endColumn: 24 },
            text: '(5 instanceof number)',
          },
        ],
      },
      {
        message:
          "Wrap negation in '()' to make the intention explicit. This preserves the current behavior.",
        edits: [{ loc: { line: 1, column: 4, endLine: 1, endColumn: 6 }, text: '(!5)' }],
      },
    ]);
  });


  it('should throw when no customized message available for eslint fix', () => {
    expect(() => getMessageForFix('brace-style')).toThrow();
  });

});

function getQuickFix(code: string, ruleKey: string) {
  const linter = new LinterWrapper(
    [{ key: ruleKey, configurations: [], fileTypeTarget: ['MAIN'] }],
    [],
    [],
    [],
  );

  const sourceCode = parseTypeScriptSourceFile(code, filePath, [tsConfig]) as SourceCode;
  const result = linter.analyze(sourceCode, filePath).issues;
  expect(result).toHaveLength(1);

  return result[0].quickFixes;
}
