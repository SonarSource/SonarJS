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

import { JsTsLanguage } from '../../../../shared/src/helpers/language.js';

export type ValueType = 'string' | 'number' | 'array' | 'boolean' | 'integer';
export type Default = string | boolean | number | string[] | number[];

type ESLintConfigurationDefaultProperty = {
  type: ValueType;
  default: Default;
  items?: {
    type: 'string' | 'integer';
  };
};

/**
 * Necessary for the property to show up in the SonarQube interface.
 * @param description will explain to the user what the property configures
 * @param displayName only necessary if the name of the property is different from the `field` name
 * @param fieldType only necessary if you need to override the default fieldType in SQ
 */
export type ESLintConfigurationSQProperty = ESLintConfigurationDefaultProperty & {
  description: string;
  displayName?: string;
  fieldType?: 'TEXT';
  language?: JsTsLanguage;
};

export type ESLintConfigurationProperty =
  | ESLintConfigurationDefaultProperty
  | ESLintConfigurationSQProperty;

type ESLintConfigurationNamedProperty = ESLintConfigurationProperty & {
  field: string;
};

type ESLintConfigurationElement = ESLintConfigurationNamedProperty[] | ESLintConfigurationProperty;

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
