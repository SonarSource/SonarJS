/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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

import { Rule } from 'eslint';
import { SONAR_RUNTIME } from './';

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
