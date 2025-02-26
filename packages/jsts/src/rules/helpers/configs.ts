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
  field?: string;
  type: 'string' | 'number' | 'array' | 'boolean' | 'integer';
  default: string | boolean | number | string[] | number[];
  description?: string;
  sqName?: string;
  sqFieldType?: 'TEXT';
  items?: {
    type: string;
  };
};

type ESLintConfigurationElement = ESLintConfigurationProperty[] | ESLintConfigurationProperty;

export type ESLintConfiguration = ESLintConfigurationElement[];
