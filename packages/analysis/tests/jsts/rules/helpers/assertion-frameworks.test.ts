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
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect } from 'expect';
import { Linter, type Rule } from 'eslint';
import type estree from 'estree';
import {
  hasAssertionEvidenceSource,
  isAssertionEvidence,
  type AssertionEvidenceProfile,
} from '../../../../src/jsts/rules/helpers/testing/assertion-frameworks.js';

const AWS_CDK_PROFILE = {
  awsCdk: {},
} satisfies AssertionEvidenceProfile;

const NODE_ASSERT_PROFILE = {
  nodeAssert: {},
} satisfies AssertionEvidenceProfile;

/** Selects a framework the fixture neither imports nor depends on. */
const CHAI_PROFILE = {
  chai: {},
} satisfies AssertionEvidenceProfile;

const EMPTY_PROFILE = {} satisfies AssertionEvidenceProfile;

const filename = join(import.meta.dirname, 'fixtures', 'assertion-frameworks.js');
const source = readFileSync(filename, 'utf8');

/** Runs `visit` as an ESLint rule over the fixture, so the callback gets a real rule context. */
function lintFixture(visit: (context: Rule.RuleContext) => Rule.RuleListener): void {
  const collect: Rule.RuleModule = { create: visit };
  new Linter().verify(
    source,
    {
      languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      plugins: { test: { rules: { collect } } },
      rules: { 'test/collect': 'error' },
    },
    { filename },
  );
}

function detectedAssertions(profile: AssertionEvidenceProfile): string[] {
  const detected: string[] = [];
  lintFixture(context => ({
    CallExpression(node: estree.CallExpression) {
      if (isAssertionEvidence(context, node, profile)) {
        detected.push(context.sourceCode.getText(node));
      }
    },
  }));
  return detected;
}

function hasEvidenceSource(profile: AssertionEvidenceProfile): boolean {
  let hasSource = false;
  lintFixture(context => {
    hasSource = hasAssertionEvidenceSource(context, profile);
    return {};
  });
  return hasSource;
}

describe('assertion framework profiles', () => {
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
    expect(hasEvidenceSource(CHAI_PROFILE)).toEqual(false);
    expect(hasEvidenceSource(EMPTY_PROFILE)).toEqual(false);
  });
});
