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
import type { FunctionDefinition } from '../function-definition';
import type { TypeInfo } from '../type-info';
import type { Value } from '../value';
import { createValueInstruction, type BaseValueInstruction } from './value-instruction';
import type { Location } from '../location';

export type CallInstruction = BaseValueInstruction<'call'> & {
  readonly functionDefinition: FunctionDefinition;
  readonly isInstanceMethodCall: boolean;
};

export const createCallInstruction = (
  valueIndex: number,
  variableName: string | null,
  functionDefinition: FunctionDefinition,
  operands: Array<Value>,
  location: Location,
  staticType: TypeInfo = {
    kind: 0,
    qualifiedName: 'any',
    hasIncompleteSemantics: false,
  },
): CallInstruction => {
  return {
    ...createValueInstruction('call', valueIndex, variableName, operands, location, staticType),
    functionDefinition,
    isInstanceMethodCall: false,
  };
};
