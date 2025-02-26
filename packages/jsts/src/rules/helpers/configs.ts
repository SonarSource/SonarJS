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

type ESLintConfigurationProperty = {
  type: 'string' | 'number' | 'array' | 'boolean' | 'integer';
  default: string | boolean | number | string[] | number[];
  description?: string;
  sqName?: string;
  sqFieldType?: 'TEXT';
  items?: {
    type: string;
  };
};

type ESLintNamedProperty = ESLintConfigurationProperty & {
  field: string;
};

type ESLintConfigurationElement = ESLintNamedProperty[] | ESLintConfigurationProperty;

export type ESLintConfiguration = ESLintConfigurationElement[];

export function defaultOptions(configuration?: ESLintConfiguration) {
  return configuration?.map(element => {
    if (Array.isArray(element)) {
      return Object.fromEntries(
        element.map(namedProperty => [namedProperty.field, namedProperty.default]),
      );
    } else {
      return element.default;
    }
  });
}
