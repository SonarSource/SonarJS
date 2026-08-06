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
import { importsOrDependsOnModule } from '../module.js';
import * as NodeTest from './node-test.js';
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

/**
 * Every assertion framework the analyzer can recognise, keyed by a stable profile name.
 *
 * This is the single catalog: a framework is added once here — its module specifiers and its AST
 * and type-aware detectors — and rules opt in by listing its key in a profile. Nothing here decides
 * what a match *means*; that is the rule's job, expressed as the profile's extension value (see
 * {@link AssertionExecution} for S8784's script-capable / runner-bound split). A rule that never
 * lists a key is blind to that framework, both for `imports`/`dependencies` gating and detection.
 *
 * `imports` are module specifiers whose presence in the linted file proves the framework is in
 * play; `dependencies` are packages that expose their assertion API as globals, so a manifest
 * dependency is enough and no import appears in the file.
 */
const assertionFrameworks = {
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
  nodeTest: {
    // `node:test`'s own `t.assert.*`. Separate from `nodeAssert`: same underlying methods, but
    // reached through the runner-supplied test context, so neither the import nor the receiver
    // looks like `node:assert`.
    //
    // `imports` is deliberately empty even though `node:test` would qualify. Listing it would make
    // every `node:test` file an assertion-evidence source, which is a gating change — rules would
    // start analysing files they skip today. This entry exists to stop `t.assert.*` being missed in
    // files already under analysis, not to widen which files those are.
    imports: [],
    dependencies: [],
    isAssertion: NodeTest.isAssertion,
    isTSAssertion: NodeTest.isTSAssertion,
  },
  uvu: {
    imports: ['uvu/assert'],
    dependencies: [],
    isAssertion: Uvu.isAssertion,
    isTSAssertion: Uvu.isTSAssertion,
  },
  vitest: {
    imports: ['vitest', 'vitest/node'],
    dependencies: [],
    isAssertion: Vitest.isAssertion,
    isTSAssertion: Vitest.isTSAssertion,
  },
  cypress: {
    // Cypress exposes `cy` as a global, so a manifest dependency is the only signal — the spec
    // file never imports the package.
    imports: [],
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

type AssertionFrameworkKey = keyof typeof assertionFrameworks;

const ASSERTION_FRAMEWORK_KEYS = Object.keys(assertionFrameworks) as AssertionFrameworkKey[];

/**
 * A rule's selection of frameworks from {@link assertionFrameworks}, each mapped to whatever that
 * rule needs to know about it (`T`). Rules declare one as a module constant, so the set of
 * frameworks a rule reacts to is readable in one place instead of being implied by which helper it
 * happens to call.
 *
 * Rules use the two concrete aliases below, never this generic directly: `T` is what makes an
 * evidence profile and an execution profile different types, and picking `T` per call site is how
 * they would drift back into being interchangeable.
 */
type AssertionFrameworkProfile<T> = Partial<Record<AssertionFrameworkKey, T>>;

/**
 * A profile covering every framework in {@link assertionFrameworks}, for rules that react to all of
 * them. Derived from the catalog rather than written out at the call site, so a framework added to
 * the catalog reaches those rules instead of being silently invisible to them — an opt-in catalog
 * makes an omission a false negative with nothing to fail.
 *
 * `overrides` carries the extension for the frameworks that need one; every other key gets `{}`.
 * Call it once per rule, at module scope: {@link getFrameworkEntries} caches on profile identity,
 * so a fresh object per `create()` would rebuild the entries for every linted file.
 */
export function allAssertionFrameworks(
  overrides: AssertionEvidenceProfile = {},
): AssertionEvidenceProfile {
  return Object.fromEntries(ASSERTION_FRAMEWORK_KEYS.map(key => [key, overrides[key] ?? {}]));
}

/**
 * Extra per-framework detection a rule can bolt onto the catalog's own detectors.
 *
 * `isTSAssertionFallback` runs when the catalog's type-aware detector misses. It is
 * library-agnostic by design: the type-aware resolver only follows declaration initializers, so
 * any framework whose assertion object is *assigned* in test setup rather than declared with an
 * initializer needs it. AWS CDK is simply the only one that does today.
 */
type AssertionEvidenceExtension = {
  isTSAssertionFallback?: (
    context: Rule.RuleContext,
    services: ParserServicesWithTypeInformation,
    node: ts.Node,
  ) => boolean;
};

/**
 * Whether a framework's assertions can run without a test runner. Script-capable ones are ordinary
 * libraries usable in a plain `node file.js`; runner-bound ones only exist because a runner
 * executes the file. Used as a profile extension by rules that treat the two differently.
 */
export type AssertionExecution = 'script-capable' | 'runner-bound';

/**
 * Profile for rules that only ask whether an assertion is present. `{}` selects a framework with no
 * extra behaviour; see {@link AssertionEvidenceExtension} for what an entry may carry.
 */
export type AssertionEvidenceProfile = AssertionFrameworkProfile<AssertionEvidenceExtension>;

/**
 * Profile for rules that additionally reason about {@link AssertionExecution}.
 *
 * Deliberately not interchangeable with {@link AssertionEvidenceProfile}: an execution profile
 * carries strings, which do not satisfy the evidence extension's object shape, so passing one to an
 * evidence entry point is a compile error rather than a silently ignored extension.
 *
 * Total, unlike the other profiles: classifying a framework is a judgement no default can stand in
 * for, so a framework added to {@link assertionFrameworks} must be classified here — a missing key
 * is a compile error rather than a framework the rule quietly stops seeing. Rules needing every
 * framework with uniform behaviour use {@link allAssertionFrameworks} instead.
 */
export type AssertionExecutionProfile = Record<AssertionFrameworkKey, AssertionExecution>;

/**
 * Whether the linted file imports, or the project depends on, any framework in `profile`. Rules
 * gate on this to stay silent in files that are not tests, before doing any per-node work.
 */
export function hasAssertionEvidenceSource(
  context: Rule.RuleContext,
  profile: AssertionEvidenceProfile,
): boolean {
  return hasAssertionFrameworkSource(context, profile);
}

/**
 * Whether `node` is an assertion call from any framework in `profile`. Pure-AST: needs no type
 * information. Frameworks outside the profile are invisible, so this answers "did the rule see an
 * assertion it cares about?", not "is this an assertion?".
 */
export function isAssertionEvidence(
  context: Rule.RuleContext,
  node: estree.Node,
  profile: AssertionEvidenceProfile,
): boolean {
  return getFrameworkEntries(profile).some(({ framework }) => framework.isAssertion(context, node));
}

/**
 * Type-checker-aware counterpart of {@link isAssertionEvidence}, operating on TypeScript AST nodes.
 * Used when parser services are available to follow resolved types across declarations, and falls
 * back to each profile entry's {@link AssertionEvidenceExtension.isTSAssertionFallback} when the
 * catalog's own type-aware detector misses.
 */
export function isTypeScriptAssertionEvidence(
  context: Rule.RuleContext,
  services: ParserServicesWithTypeInformation,
  node: ts.Node,
  profile: AssertionEvidenceProfile,
): boolean {
  return getFrameworkEntries(profile).some(
    ({ framework, extension }) =>
      framework.isTSAssertion?.(services, node) ||
      extension.isTSAssertionFallback?.(context, services, node),
  );
}

/**
 * {@link hasAssertionEvidenceSource} for profiles carrying an {@link AssertionExecution}. Same
 * check — the separate name keeps a rule's gating call and its per-node call reading against the
 * same vocabulary.
 */
export function hasAssertionExecutionSource(
  context: Rule.RuleContext,
  profile: AssertionExecutionProfile,
): boolean {
  return hasAssertionFrameworkSource(context, profile);
}

/**
 * The `extension` of the first profile framework that claims `node`, or `undefined` if none does.
 *
 * Classification is per *node*, not per statement, and a single assertion statement often has
 * several matching nodes that do not agree. A chai `expect(x).to.equal(y)` matches the Chai
 * detector on the inner `chai.expect(...)` call and the name-based global-`expect` detector on
 * the outer `.to.equal(...)` call, so with an {@link AssertionExecution} profile the same
 * statement yields both `script-capable` and `runner-bound`. Callers that reason about the
 * classification must combine the nodes of a statement themselves — see how S8784 ORs
 * `script-capable` across a statement rather than trusting any single node.
 */
export function getAssertionExecution(
  context: Rule.RuleContext,
  node: estree.Node,
  profile: AssertionExecutionProfile,
): AssertionExecution | undefined {
  return getFrameworkEntries(profile).find(({ framework }) => framework.isAssertion(context, node))
    ?.extension;
}

function hasAssertionFrameworkSource<T>(
  context: Rule.RuleContext,
  profile: AssertionFrameworkProfile<T>,
): boolean {
  const entries = getFrameworkEntries(profile);
  return importsOrDependsOnModule(
    context,
    entries.flatMap(({ framework }) => framework.imports),
    entries.flatMap(({ framework }) => framework.dependencies),
  );
}

/**
 * Profiles are module constants, but the detection entry points run on every visited node, so the
 * resolved entries are cached per profile object rather than rebuilt per call.
 */
const frameworkEntriesCache = new WeakMap<object, unknown[]>();

function getFrameworkEntries<T>(profile: AssertionFrameworkProfile<T>) {
  const cached = frameworkEntriesCache.get(profile);
  if (cached !== undefined) {
    return cached as FrameworkEntry<T>[];
  }
  const entries = Object.entries(profile).flatMap(([key, extension]) => {
    if (extension === undefined) {
      return [];
    }
    return [{ framework: assertionFrameworks[key as AssertionFrameworkKey], extension }];
  });
  frameworkEntriesCache.set(profile, entries);
  return entries;
}

type FrameworkEntry<T> = {
  framework: (typeof assertionFrameworks)[AssertionFrameworkKey];
  extension: T;
};
