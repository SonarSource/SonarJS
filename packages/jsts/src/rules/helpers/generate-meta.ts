/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { SONAR_RUNTIME } from './index.js';

export function generateMeta(
  rspecMeta: Rule.RuleMetaData,
  ruleMeta?: Rule.RuleMetaData,
  hasSecondaries = false,
): Rule.RuleMetaData {
  if (rspecMeta.fixable && !ruleMeta?.fixable && !ruleMeta?.hasSuggestions) {
    throw new Error(
      `Mismatch between RSPEC metadata and implementation for fixable attribute in rule ${rspecMeta.docs!.url}`,
    );
  }
  //rspec metadata should overwrite eslint metadata for decorated rules, our titles and docs should be shown instead
  const metadata = {
    ...ruleMeta,
    ...rspecMeta,
  };

  // RSPEC metadata can include fixable also for rules with suggestions, because RSPEC doesn't differentiate between fix
  // and suggestion like ESLint does. That's why we set fixable using ruleMeta
  metadata.fixable = ruleMeta?.fixable;

  if (!metadata.messages) {
    metadata.messages = {};
  }

  metadata.messages.sonarRuntime = '{{sonarRuntimeData}}';

  if (hasSecondaries) {
    const sonarOptions = {
      type: 'string',
      enum: [SONAR_RUNTIME, 'metric'], // 'metric' only used by S3776
    };

    if (metadata.schema) {
      if (Array.isArray(metadata.schema)) {
        metadata.schema = [...metadata.schema, sonarOptions];
      } else if (metadata.schema.type === 'array') {
        if (Array.isArray(metadata.schema.items)) {
          metadata.schema = {
            ...metadata.schema,
            items: [...metadata.schema.items, sonarOptions],
          };
        } else {
          metadata.schema = {
            ...metadata.schema,
            items: [metadata.schema.items, sonarOptions],
          };
        }
      }
    } else {
      metadata.schema = [sonarOptions];
    }
  }
  return metadata;
}
