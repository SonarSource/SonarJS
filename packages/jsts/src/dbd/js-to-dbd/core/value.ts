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
import type { Constant } from './values/constant';
import type { Parameter } from './values/parameter';
import type { TypeName } from './values/type-name';
import type { Reference } from './values/reference';

export type Value = Constant | Parameter | Reference | TypeName;

/**
 * The implementation of the concept of [ECMAScript Language Value](https://262.ecma-international.org/14.0/#sec-ecmascript-language-types)
 *
 * @todo Maybe rename as ECMAScriptLanguageValue to better convey this stance
 */
export type BaseValue<Type extends string | null> = {
  readonly identifier: number;
  readonly type: Type | null;
};

export const createValue = <Type extends string>(
  type: Type,
  identifier: number,
): BaseValue<Type> => {
  return {
    identifier,
    type,
  };
};
