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
import type { TypeInfo } from '../type-info';
import { type BaseValue, createValue } from '../value';
import { createReference, type Reference } from './reference';

export type Constant = BaseValue<'constant'> & {
  readonly value: bigint | boolean | null | number | RegExp | string | undefined;
  readonly typeInfo: TypeInfo;
};

export const createConstant = (identifier: number, value: Constant['value']): Constant => {
  return {
    ...createValue('constant', identifier),
    typeInfo: {
      kind: 'PRIMITIVE',
      qualifiedName: 'int',
      hasIncompleteSemantics: true,
    },
    value,
  };
};

// todo: move to reference module
export const createNull = (): Reference => {
  return createReference(-1);
};

export const isAConstant = (value: BaseValue<any>): value is Constant => {
  return (value as Constant).type === 'constant';
};
