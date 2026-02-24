/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { join, basename } from 'node:path/posix';
import { writeResults } from './lits.js';
import projects from './projects.json' with { type: 'json' };
import { analyzeProject } from '../jsts/src/analysis/projectAnalysis/analyzeProject.js';
import { initFileStores } from '../jsts/src/analysis/projectAnalysis/file-stores/index.js';
import { normalizePath, normalizeToAbsolutePath } from '../shared/src/helpers/files.js';
import { createConfiguration } from '../shared/src/helpers/configuration.js';
import { compare, Result } from 'dir-compare';
import { RuleConfig } from '../jsts/src/linter/config/rule-config.js';
import { expect } from 'expect';
import * as metas from '../jsts/src/rules/metas.js';
import { SonarMeta } from '../jsts/src/rules/helpers/index.js';
import { symlink } from 'node:fs/promises';
import { cssRulesMeta } from '../css/src/rules/metadata.js';
import type { RuleConfig as CssRuleConfig } from '../css/src/linter/config.js';

const currentPath = normalizePath(import.meta.dirname);

const SONARJS_ROOT = join(currentPath, '..', '..');
const sourcesPath = join(SONARJS_ROOT, '..', 'sonarjs-ruling-sources');
const expectedBase = join(SONARJS_ROOT, 'its', 'ruling', 'src', 'test', 'expected');
const actualBase = join(currentPath, 'actual');

await symlink(join(SONARJS_ROOT, 'its', 'sources'), sourcesPath).catch(err => {
  if (err.code !== 'EEXIST') {
    throw err;
  }
});

const DEFAULT_EXCLUSIONS = ['**/.*', '**/*.d.ts'];

type ProjectsData = {
  name: string;
  folder?: string;
  testDir: string | null;
  exclusions: string | null;
};

export function projectName(projectFile: string) {
  const filename = basename(normalizePath(projectFile));
  return filename.substring(0, filename.length - '.ruling.test.ts'.length);
}

export async function testProject(projectName: string) {
  const { folder, name, exclusions, testDir } = (projects as ProjectsData[]).find(
    p => p.name === projectName,
  )!;
  const rules = Object.entries(metas)
    .flatMap(([key, meta]: [string, SonarMeta]): RuleConfig[] => {
      return meta.languages.map(language => ({
        key,
        configurations: [],
        language,
        fileTypeTargets: meta.scope === 'Tests' ? ['TEST'] : ['MAIN'],
        analysisModes: ['DEFAULT'],
        blacklistedExtensions: meta.blacklistedExtensions,
      }));
    })
    .map(applyRulingConfig);
  const expectedPath = join(expectedBase, name);
  const actualPath = join(actualBase, name);

  const baseDir = normalizeToAbsolutePath(join(sourcesPath, folder ?? join('projects', name)));

  const configuration = createConfiguration({
    baseDir,
    maxFileSize: 4000,
    canAccessFileSystem: true,
    tests: testDir ? [testDir] : undefined,
    exclusions: exclusions ? DEFAULT_EXCLUSIONS.concat(exclusions.split(',')) : DEFAULT_EXCLUSIONS,
  });

  await initFileStores(configuration);

  const results = await analyzeProject(
    {
      rules,
      cssRules: buildCssRules(),
      bundles: [],
    },
    configuration,
  );

  await writeResults(baseDir, name, results, actualPath);

  return await compare(expectedPath, actualPath, { compareContent: true });
}

export function ok(diff: Result) {
  expect(
    JSON.stringify(
      diff.diffSet!.filter(value => value.state !== 'equal'),
      null,
      2,
    ),
  ).toEqual('[]');
}

/**
 * Build CSS rule configs with default parameters for all CSS rules
 */
function buildCssRules(): CssRuleConfig[] {
  return cssRulesMeta.map(meta => {
    const configurations: unknown[] = [];

    if (meta.listParam?.length) {
      const secondaryOptions: Record<string, string[]> = {};
      for (const param of meta.listParam) {
        if (param.default.trim() !== '') {
          secondaryOptions[param.stylelintOptionKey] = param.default.split(',').map(v => v.trim());
        }
      }
      if (Object.keys(secondaryOptions).length > 0) {
        configurations.push(true, secondaryOptions);
      }
    } else if (meta.booleanParam?.default) {
      const secondaryOptions: Record<string, string[]> = {};
      for (const opt of meta.booleanParam.onTrue) {
        secondaryOptions[opt.stylelintOptionKey] = opt.values;
      }
      configurations.push(true, secondaryOptions);
    }

    return { key: meta.stylelintKey, configurations };
  });
}

/**
 * Apply the non-default configuration for some rules
 */
function applyRulingConfig(rule: RuleConfig) {
  switch (rule.key) {
    case 'S1451': {
      if (rule.language === 'js') {
        rule.configurations.push({
          headerFormat: String.raw`// Copyright 20\d\d The Closure Library Authors. All Rights Reserved.`,
          isRegularExpression: true,
        });
      } else {
        rule.configurations.push({
          headerFormat: '//.*',
          isRegularExpression: true,
        });
      }
      break;
    }
    case 'S124': {
      rule.configurations.push({
        regularExpression: '.*TODO.*',
        flags: 'i',
      });
      break;
    }
    case 'S1192': {
      if (rule.language === 'js') {
        rule.configurations.push({
          threshold: 4,
        });
      }
      break;
    }
  }
  return rule;
}
