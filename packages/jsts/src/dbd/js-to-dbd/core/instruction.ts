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
import type { TerminatorInstruction } from './instructions/terminator-instruction';
import type { ValueInstruction } from './instructions/value-instruction';
import type { Location } from './location';
import type { Value } from './value';

export type Instruction = TerminatorInstruction | ValueInstruction;

export type BaseInstruction<Type extends string, Operands extends Array<Value>> = {
  type: Type;
  location: Location;
  operands: Operands;
};

export const createInstruction = <Type extends string, Operands extends Array<Value>>(
  type: Type,
  operands: Operands,
  location: Location,
): BaseInstruction<Type, Operands> => {
  return {
    type,
    location,
    operands,
  };
};
