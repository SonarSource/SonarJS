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
import type { ESLintConfiguration } from '../../../jsts/src/rules/helpers/configs.js';

/**
 * Metadata for a SonarQube rule, extracted from the rule's meta.ts file.
 *
 * @property sonarKey - The SonarQube rule key (e.g., 'S100', 'S107')
 * @property scope - Whether the rule applies to 'Main' source files or 'Tests'
 * @property languages - Which languages the rule supports ('js', 'ts', or both)
 * @property fields - Optional ESLint configuration schema defining the rule's parameters
 *
 * @see RULE_CONFIG_PATTERNS.md for details on how fields are structured
 */
export type RuleMeta = {
  sonarKey: string;
  scope: 'Main' | 'Tests';
  languages: ('js' | 'ts')[];
  fields?: ESLintConfiguration;
};

/**
 * A field definition from a rule's config.ts file, representing a single
 * configurable parameter within an object configuration.
 *
 * Used in Type A (single object config) and Type D (mixed) configuration patterns.
 *
 * @property field - The ESLint config property name (used in the output config object)
 * @property displayName - Optional SonarQube parameter key. If omitted, `field` is used as the SQ key
 * @property default - The default value, also used to determine the type for parsing
 *
 * @example
 * // S107 has displayName different from field:
 * { field: 'max', displayName: 'maximumFunctionParameters', default: 7 }
 * // SQ sends: { key: 'maximumFunctionParameters', value: '5' }
 * // ESLint receives: { max: 5 }
 *
 * @example
 * // S100 uses field name as SQ key (no displayName):
 * { field: 'format', default: '^[_a-z][a-zA-Z0-9]*$' }
 * // SQ sends: { key: 'format', value: '^[A-Z].*$' }
 * // ESLint receives: { format: '^[A-Z].*$' }
 */
export type FieldDef = {
  field: string;
  displayName?: string;
  default: unknown;
};
