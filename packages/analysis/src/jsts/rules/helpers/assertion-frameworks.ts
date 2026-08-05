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
import type { Rule } from 'eslint';
import type estree from 'estree';
import type { ParserServicesWithTypeInformation } from '@typescript-eslint/utils';
import ts from 'typescript';
import * as AwsCdk from './assertions-aws-cdk.js';
import * as Chai from './chai.js';
import * as Cypress from './cypress.js';
import {
  isChaiShouldTSAssertion,
  isGlobalExpectAssertion,
  isGlobalTSExpectAssertion,
  isNodeAssertAssertion,
  isNodeAssertTSAssertion,
} from './assertion-detection.js';
import { importsOrDependsOnModule } from './module.js';
import * as Sinon from './sinon.js';
import * as Supertest from './supertest.js';
import * as Uvu from './uvu.js';
import * as Vitest from './vitest.js';

type AssertionDetector = (context: Rule.RuleContext, node: estree.Node) => boolean;
type TypeScriptAssertionDetector = (
  services: ParserServicesWithTypeInformation,
  node: ts.Node,
) => boolean;

type AssertionFrameworkDefinition = {
  imports: string[];
  dependencies: string[];
  isAssertion: AssertionDetector;
  isTSAssertion?: TypeScriptAssertionDetector;
};

export const assertionFrameworks = {
  chai: {
    imports: ['chai'],
    dependencies: [],
    isAssertion: Chai.isAssertion,
    isTSAssertion: (services, node) =>
      Chai.isTSAssertion(services, node) || isChaiShouldTSAssertion(node),
  },
  sinon: {
    imports: ['sinon'],
    dependencies: [],
    isAssertion: Sinon.isAssertion,
    isTSAssertion: Sinon.isTSAssertion,
  },
  supertest: {
    imports: ['supertest'],
    dependencies: [],
    isAssertion: Supertest.isAssertion,
    isTSAssertion: Supertest.isTSAssertion,
  },
  nodeAssert: {
    imports: ['assert', 'assert/strict', 'node:assert', 'node:assert/strict'],
    dependencies: [],
    isAssertion: isNodeAssertAssertion,
    isTSAssertion: isNodeAssertTSAssertion,
  },
  uvu: {
    imports: ['uvu/assert'],
    dependencies: [],
    isAssertion: Uvu.isAssertion,
    isTSAssertion: Uvu.isTSAssertion,
  },
  vitest: {
    imports: ['vitest'],
    dependencies: [],
    isAssertion: Vitest.isAssertion,
    isTSAssertion: Vitest.isTSAssertion,
  },
  cypress: {
    imports: ['cypress'],
    dependencies: ['cypress'],
    isAssertion: (_context, node) => Cypress.isAssertion(node),
    isTSAssertion: (_services, node) => Cypress.isTSAssertion(node),
  },
  globalExpect: {
    imports: ['bun:test', '@playwright/test'],
    dependencies: ['jasmine', 'jest', 'cypress', '@playwright/test'],
    isAssertion: (context, node) =>
      node.type === 'CallExpression' && isGlobalExpectAssertion(context, node),
    isTSAssertion: isGlobalTSExpectAssertion,
  },
  awsCdk: {
    imports: ['aws-cdk-lib/assertions'],
    dependencies: [],
    isAssertion: AwsCdk.isAssertion,
    isTSAssertion: AwsCdk.isTSAssertion,
  },
} satisfies Record<string, AssertionFrameworkDefinition>;

export type AssertionFrameworkKey = keyof typeof assertionFrameworks;
export type AssertionFrameworkProfile<T = Record<never, never>> = Partial<
  Record<AssertionFrameworkKey, T>
>;

export type AssertionEvidenceExtension = {
  isTSAssertionFallback?: (
    context: Rule.RuleContext,
    services: ParserServicesWithTypeInformation,
    node: ts.Node,
  ) => boolean;
};

export type AssertionExecution = 'script-capable' | 'runner-bound';

export function hasAssertionEvidenceSource(
  context: Rule.RuleContext,
  profile: AssertionFrameworkProfile,
): boolean {
  return hasAssertionFrameworkSource(context, profile);
}

export function isAssertionEvidence(
  context: Rule.RuleContext,
  node: estree.Node,
  profile: AssertionFrameworkProfile,
): boolean {
  return getFrameworkEntries(profile).some(({ framework }) => framework.isAssertion(context, node));
}

export function isTypeScriptAssertionEvidence(
  context: Rule.RuleContext,
  services: ParserServicesWithTypeInformation,
  node: ts.Node,
  profile: AssertionFrameworkProfile<AssertionEvidenceExtension>,
): boolean {
  return getFrameworkEntries(profile).some(
    ({ framework, extension }) =>
      framework.isTSAssertion?.(services, node) ||
      extension.isTSAssertionFallback?.(context, services, node),
  );
}

export function hasAssertionExecutionSource(
  context: Rule.RuleContext,
  profile: AssertionFrameworkProfile<AssertionExecution>,
): boolean {
  return hasAssertionFrameworkSource(context, profile);
}

export function getAssertionExecution(
  context: Rule.RuleContext,
  node: estree.Node,
  profile: AssertionFrameworkProfile<AssertionExecution>,
): AssertionExecution | undefined {
  return getFrameworkEntries(profile).find(({ framework }) => framework.isAssertion(context, node))
    ?.extension;
}

function hasAssertionFrameworkSource(
  context: Rule.RuleContext,
  profile: AssertionFrameworkProfile,
): boolean {
  const entries = getFrameworkEntries(profile);
  return importsOrDependsOnModule(
    context,
    entries.flatMap(({ framework }) => framework.imports),
    entries.flatMap(({ framework }) => framework.dependencies),
  );
}

function getFrameworkEntries<T>(profile: AssertionFrameworkProfile<T>) {
  return Object.entries(profile).flatMap(([key, extension]) => {
    if (extension === undefined) {
      return [];
    }
    return [{ framework: assertionFrameworks[key as AssertionFrameworkKey], extension }];
  });
}
