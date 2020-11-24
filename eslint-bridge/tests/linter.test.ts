/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import { getRuleConfig, decodeSonarRuntimeIssue, LinterWrapper } from 'linter';
import { Rule, SourceCode } from 'eslint';
import { SYMBOL_HIGHLIGHTING_RULE, COGNITIVE_COMPLEXITY_RULE } from 'analyzer';
import { parseJavaScriptSourceFile } from 'parser';
import { setContext } from 'context';

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

const filePath = '/some/path/of/some/file.ts';

describe('#getRuleConfig', () => {
  it("should set sonar-runtime when it's defined in the rule schema", () => {
    const config = getRuleConfig(ruleUsingSecondaryLocations, {
      key: 'ruleUsingSecondaryLocations',
      configurations: [],
    });
    expect(config).toContain('sonar-runtime');
  });

  it("should not set sonar-runtime when it's not defined in the rule schema", () => {
    const config = getRuleConfig(undefined, {
      key: 'regularRule',
      configurations: [],
    });
    expect(config).not.toContain('sonar-runtime');
  });

  it('should always set sonar-runtime as last option', () => {
    const config = getRuleConfig(ruleUsingSecondaryLocations, {
      key: 'ruleUsingSecondaryLocations',
      configurations: ['someOtherOption'],
    });
    expect(config).toEqual(['someOtherOption', 'sonar-runtime']);
  });

  it('should log debug when rule module is not found', () => {
    console.log = jest.fn();
    const config = getRuleConfig(undefined, {
      key: 'notExistingRuleModule',
      configurations: [],
    });
    expect(console.log).toHaveBeenCalledWith(
      'DEBUG ruleModule not found for rule notExistingRuleModule',
    );
    expect(config).toEqual([]);
    jest.resetAllMocks();
  });

  it('should provide context when there is sonar-context in schema', () => {
    setContext({ workDir: '/tmp/workdir', shouldUseTypeScriptParserForJS: true });
    const config = getRuleConfig(ruleUsingContext, {
      key: 'ruleUsingContext',
      configurations: [],
    });
    expect(config).toEqual([{ workDir: '/tmp/workdir', shouldUseTypeScriptParserForJS: true }]);
  });

  it('should provide context and set sonar-runtime when there is sonar-context and sonar-runtime in schema', () => {
    setContext({ workDir: '/tmp/workdir', shouldUseTypeScriptParserForJS: true });
    const config = getRuleConfig(ruleUsingContextAndSecondaryLocations, {
      key: 'ruleUsingContextAndSecondaryLocations',
      configurations: ['config'],
    });
    expect(config).toEqual([
      'config',
      'sonar-runtime',
      { workDir: '/tmp/workdir', shouldUseTypeScriptParserForJS: true },
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
    console.error = jest.fn();
    const decodedIssue = decodeSonarRuntimeIssue(ruleUsingSecondaryLocations, {
      ...issueWithEncodedMessage,
      message: 'Incorrect message',
    });
    expect(decodedIssue).toBe(null);
    expect(console.error).toHaveBeenCalledWith(
      `Failed to parse encoded issue message for rule ${issue.ruleId}:\n"Incorrect message"`,
      new SyntaxError('Unexpected token I in JSON at position 0'),
    );
    jest.resetAllMocks();
  });

  it('should compute symbol highlighting when additional rule', () => {
    const sourceCode = parseJavaScriptSourceFile('let x = 42;', `foo.js`) as SourceCode;
    const linter = new LinterWrapper([], [SYMBOL_HIGHLIGHTING_RULE]);
    const result = linter.analyze(sourceCode, filePath).issues;
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toEqual(SYMBOL_HIGHLIGHTING_RULE.ruleId);
    expect(result[0].message).toEqual(
      `[{\"declaration\":{\"startLine\":1,\"startCol\":4,\"endLine\":1,\"endCol\":5},\"references\":[]}]`,
    );
  });

  it('should not compute symbol highlighting when no additional rule', () => {
    const sourceCode = parseJavaScriptSourceFile('let x = 42;', `foo.js`) as SourceCode;
    const linter = new LinterWrapper([]);
    const result = linter.analyze(sourceCode, filePath).issues;
    expect(result).toHaveLength(0);
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

  it('should compute cognitive complexity when additional rule', () => {
    const sourceCode = parseJavaScriptSourceFile(
      'if (true) if (true) if (true) return;',
      `foo.js`,
    ) as SourceCode;
    const linter = new LinterWrapper([], [COGNITIVE_COMPLEXITY_RULE]);
    const result = linter.analyze(sourceCode, filePath).issues;
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toEqual(COGNITIVE_COMPLEXITY_RULE.ruleId);
    expect(result[0].message).toEqual('6');
  });

  it('should not report unused expressions when chai lib is used', () => {
    const sourceCode = parseJavaScriptSourceFile(
      `expect(true).to.be.true;
       42;`,
      `foo.js`, // we report only here
    ) as SourceCode;
    const linter = new LinterWrapper([{ key: 'no-unused-expressions', configurations: [] }]);
    const result = linter.analyze(sourceCode, filePath).issues;
    expect(result).toHaveLength(1);
  });

  it('should not report on globals provided by environment configuration', () => {
    const sourceCode = parseJavaScriptSourceFile(`var alert = 1;`, `foo.js`) as SourceCode;
    const linter = new LinterWrapper(
      [{ key: 'declaration-in-global-scope', configurations: [] }],
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
      [{ key: 'declaration-in-global-scope', configurations: [] }],
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
      `class A extends B { constructor() {this.bar();}}`,
      `foo.js`,
    ) as SourceCode;
    const linter = new LinterWrapper(
      [
        { key: 'constructor-super', configurations: [] },
        { key: 'no-this-before-super', configurations: [] },
      ],
      [],
      [],
      [],
    );
    const result = linter.analyze(sourceCode, filePath).issues;
    expect(result).toHaveLength(2);
    expect(result.every(i => i.ruleId === 'constructor-super')).toBe(true);
  });
});
