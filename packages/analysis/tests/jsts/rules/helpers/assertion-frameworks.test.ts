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
import { join } from 'node:path';
import { expect } from 'expect';
import { Linter, type Rule } from 'eslint';
import type estree from 'estree';
import {
  assertionFrameworks,
  hasAssertionEvidenceSource,
  isAssertionEvidence,
  type AssertionFrameworkKey,
  type AssertionFrameworkProfile,
} from '../../../../src/jsts/rules/helpers/assertion-frameworks.js';

const awsCdk: AssertionFrameworkKey = 'awsCdk';

const AWS_CDK_PROFILE = {
  [awsCdk]: {},
} satisfies AssertionFrameworkProfile;

const NODE_ASSERT_PROFILE = {
  nodeAssert: {},
} satisfies AssertionFrameworkProfile;

const EMPTY_PROFILE = {} satisfies AssertionFrameworkProfile;

const source = `
  import assert from 'node:assert';
  import { Template } from 'aws-cdk-lib/assertions';
  assert.equal(actual, expected);
  Template.fromStack(stack).hasResourceProperties('AWS::S3::Bucket', {});
`;

const filename = join(import.meta.dirname, 'assertion-frameworks.fixture.js');

function detectedAssertions(profile: AssertionFrameworkProfile): string[] {
  const detected: string[] = [];
  const collect: Rule.RuleModule = {
    create(context) {
      return {
        CallExpression(node: estree.CallExpression) {
          if (isAssertionEvidence(context, node, profile)) {
            detected.push(context.sourceCode.getText(node));
          }
        },
      };
    },
  };

  new Linter().verify(
    source,
    {
      languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      plugins: { test: { rules: { collect } } },
      rules: { 'test/collect': 'error' },
    },
    { filename },
  );

  return detected;
}

function hasEvidenceSource(profile: AssertionFrameworkProfile): boolean {
  let hasSource = false;
  const collect: Rule.RuleModule = {
    create(context) {
      hasSource = hasAssertionEvidenceSource(context, profile);
      return {};
    },
  };

  new Linter().verify(
    source,
    {
      languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      plugins: { test: { rules: { collect } } },
      rules: { 'test/collect': 'error' },
    },
    { filename },
  );

  return hasSource;
}

describe('assertion framework profiles', () => {
  it('derives profile keys from the framework catalog', () => {
    expect(assertionFrameworks[awsCdk].imports).toContain('aws-cdk-lib/assertions');
  });

  it('only exposes assertion evidence selected by the profile', () => {
    expect(detectedAssertions(AWS_CDK_PROFILE)).toEqual([
      "Template.fromStack(stack).hasResourceProperties('AWS::S3::Bucket', {})",
    ]);
    expect(detectedAssertions(NODE_ASSERT_PROFILE)).toEqual(['assert.equal(actual, expected)']);
    expect(detectedAssertions(EMPTY_PROFILE)).toEqual([]);
  });

  it('only treats selected framework modules as assertion evidence sources', () => {
    expect(hasEvidenceSource(AWS_CDK_PROFILE)).toEqual(true);
    expect(hasEvidenceSource(NODE_ASSERT_PROFILE)).toEqual(true);
    expect(hasEvidenceSource(EMPTY_PROFILE)).toEqual(false);
  });
});
