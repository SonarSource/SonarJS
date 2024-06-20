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
import { type Value } from '../value';
import type { Location } from '../location';
import { type BaseInstruction, createInstruction } from '../instruction';
import type { CallInstruction } from './call-instruction';
import type { PhiInstruction } from './phi-instruction';
import { TypeInfo } from '../type-info';

export type ValueInstructionType = 'call' | 'phi';

export type BaseValueInstruction<Type extends ValueInstructionType> = BaseInstruction<
  Type,
  Array<Value>
> & {
  readonly valueIndex: number;
  readonly variableName: string | null;
  readonly staticType: TypeInfo | undefined;
};

export type ValueInstruction = CallInstruction | PhiInstruction;

export const createValueInstruction = <Type extends ValueInstructionType>(
  instructionType: Type,
  valueIndex: number,
  variableName: string | null,
  operands: Array<Value>,
  location: Location,
  staticType: TypeInfo | undefined,
): BaseValueInstruction<Type> => {
  return {
    ...createInstruction(instructionType, operands, location),
    valueIndex,
    variableName,
    staticType,
  };
};
