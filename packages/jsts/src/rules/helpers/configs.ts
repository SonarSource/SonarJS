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

export type Default = string | boolean | number | string[] | number[] | Object;

type ESLintConfigurationDefaultProperty = {
  default: Default;
};

/**
 * Necessary for the property to show up in the SonarQube interface.
 * @param description will explain to the user what the property configures
 * @param displayName only necessary if the name of the property is different from the `field` name
 * @param type what is the type of the option
 * @param items only necessary if type is 'array'
 * @param fieldType only necessary if you need to override the default fieldType in SQ
 * @param customForConfiguration replacement content how to pass this variable to the Configuration object
 */
export type ESLintConfigurationSQProperty = ESLintConfigurationDefaultProperty & {
  description: string;
  displayName?: string;
  customDefault?: Default;
  items?: {
    type: 'string' | 'integer';
  };
  fieldType?: 'TEXT';
  customForConfiguration?: string;
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
