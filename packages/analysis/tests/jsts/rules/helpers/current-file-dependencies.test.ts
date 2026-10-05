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
import { afterEach, describe, it } from 'node:test';
import { expect } from 'expect';
import { Linter, type Rule } from 'eslint';
import path from 'node:path';
import {
  getDependenciesSanitizePaths,
  setCurrentFileInlineDependencies,
} from '../../../../src/jsts/rules/helpers/dependency-manifests/dependencies.js';
import { clearFileCaches } from '../../../../src/jsts/rules/helpers/module.js';

describe('current file dependencies', () => {
  const fixtures = path.join(import.meta.dirname, 'fixtures');
  const frameworkDir = path.join(fixtures, 'framework-versions');
  const emptyDir = path.join(fixtures, 'external-library');

  afterEach(clearFileCaches);

  it('shares the merged dependency map across repeated lookups and rules in one file', () => {
    const [context, otherContext] = getContexts(frameworkDir);
    setCurrentFileInlineDependencies(new Map([['react', '19.0.0']]));

    const dependencies = getDependenciesSanitizePaths(context);
    expect(dependencies.get('react')).toBe('19.0.0');
    expect(dependencies.get('vue')).toBe('^3.4.0');
    expect(getDependenciesSanitizePaths(context)).toBe(dependencies);
    expect(otherContext).not.toBe(context);
    expect(getDependenciesSanitizePaths(otherContext)).toBe(dependencies);
  });

  it('replaces inline dependencies without modifying the manifest dependency cache', () => {
    const context = getContext(frameworkDir);
    setCurrentFileInlineDependencies(new Map([['react', '19.0.0']]));
    const first = getDependenciesSanitizePaths(context);

    setCurrentFileInlineDependencies(new Map([['vitest', '3.0.0']]));
    const second = getDependenciesSanitizePaths(context);
    expect(second).not.toBe(first);
    expect(second.get('react')).toBe('^18.2.0');
    expect(second.get('vitest')).toBe('3.0.0');
    expect(first.get('react')).toBe('19.0.0');

    setCurrentFileInlineDependencies(null);
    const manifest = getDependenciesSanitizePaths(context);
    expect(manifest.get('react')).toBe('^18.2.0');
    expect(manifest.has('vitest')).toBe(false);
  });

  it('evicts an earlier SourceCode when another file is analyzed', () => {
    const firstContext = getContext(frameworkDir);
    const nextContext = getContext(frameworkDir);
    setCurrentFileInlineDependencies(new Map([['react', '19.0.0']]));

    const first = getDependenciesSanitizePaths(firstContext);
    const next = getDependenciesSanitizePaths(nextContext);
    expect(next).not.toBe(first);
    expect(next).toEqual(first);

    const revisited = getDependenciesSanitizePaths(firstContext);
    expect(revisited).not.toBe(first);
    expect(revisited).not.toBe(next);
    expect(revisited).toEqual(first);
  });

  it('invalidates the merged map when file caches are cleared, even for the same SourceCode', () => {
    const context = getContext(emptyDir);
    setCurrentFileInlineDependencies(new Map([['vitest', '3.0.0']]));
    expect(getDependenciesSanitizePaths(context).has('vitest')).toBe(true);

    clearFileCaches();
    expect(getDependenciesSanitizePaths(context).size).toBe(0);
  });

  it('does not reuse another file dependency map when SourceCode changes', () => {
    const firstContext = getContext(frameworkDir);
    const dependencies = getDependenciesSanitizePaths(firstContext);
    expect(dependencies.get('react')).toBe('^18.2.0');

    const nextContext = getContext(emptyDir);
    expect(nextContext.sourceCode).not.toBe(firstContext.sourceCode);
    expect(getDependenciesSanitizePaths(nextContext).size).toBe(0);
    expect(getDependenciesSanitizePaths(firstContext)).toEqual(dependencies);
  });
});

function getContext(cwd: string): Rule.RuleContext {
  return getContexts(cwd)[0];
}

function getContexts(cwd: string): [Rule.RuleContext, Rule.RuleContext] {
  const captured: Rule.RuleContext[] = [];
  const capture: Rule.RuleModule = {
    create(context) {
      captured.push(context);
      return {};
    },
  };
  const messages = new Linter({ cwd }).verify(
    '',
    {
      plugins: { test: { rules: { first: capture, second: capture } } },
      rules: { 'test/first': 'error', 'test/second': 'error' },
      settings: { sonarRuntime: true },
    },
    path.join(cwd, 'source.js'),
  );
  expect(messages).toEqual([]);
  const [first, second] = captured;
  if (first === undefined || second === undefined) {
    throw new Error('The dependency probe rules did not run');
  }
  return [first, second];
}
