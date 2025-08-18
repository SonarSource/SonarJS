/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import type { Rule } from 'eslint';
import type { RulesMeta } from '@eslint/core';
import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema';
import { ESLintConfiguration } from './configs.js';
import merge from 'lodash.merge';

export type SonarMeta = {
  meta: Rule.RuleMetaData & { docs?: { requiresTypeChecking?: boolean } };
  sonarKey: string;
  eslintId: string;
  scope: 'All' | 'Main' | 'Tests';
  languages: ('ts' | 'js')[];
  blacklistedExtensions?: string[];
  schema?: JSONSchema4;
  hasSecondaries?: boolean;
  fields?: ESLintConfiguration;
};

export function generateMeta(sonarMeta: SonarMeta, ruleMeta?: RulesMeta): RulesMeta {
  if (sonarMeta.meta.fixable && !ruleMeta?.fixable && !ruleMeta?.hasSuggestions) {
    throw new Error(
      `Mismatch between RSPEC metadata and implementation for fixable attribute in rule ${sonarMeta.meta.docs!.url}`,
    );
  }
  // sonarMeta should overwrite eslint metadata for decorated rules, our titles and docs should be shown instead
  const metadata = {
    ...ruleMeta,
    ...sonarMeta.meta,
    schema: sonarMeta.schema ?? ruleMeta?.schema,
  };

  // If rules contains default options, we will augment them with our defaults.
  if (ruleMeta?.defaultOptions) {
    metadata.defaultOptions = merge(ruleMeta.defaultOptions, sonarMeta.meta.defaultOptions);
  }

  // RSPEC metadata can include fixable also for rules with suggestions, because RSPEC doesn't differentiate between fix
  // and suggestion like ESLint does. That's why we set fixable using ruleMeta
  metadata.fixable = ruleMeta?.fixable;

  if (!metadata.messages) {
    metadata.messages = {};
  }

  if (sonarMeta.hasSecondaries) {
    metadata.messages.sonarRuntime = '{{sonarRuntimeData}}';
  }
  return metadata;
}
