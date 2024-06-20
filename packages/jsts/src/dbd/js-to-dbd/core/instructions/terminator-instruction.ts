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
import { type BaseInstruction, createInstruction, type Instruction } from '../instruction';
import type { Location } from '../location';
import type { BranchingInstruction } from './branching-instruction';
import type { ConditionalBranchingInstruction } from './conditional-branching-instruction';
import type { ReturnInstruction } from './return-instruction';
import type { Value } from '../value';

const terminatorInstructionTypes = ['branching', 'conditional_branching', 'return'] as const;

export type TerminatorInstructionType = (typeof terminatorInstructionTypes)[number];

export type BaseTerminatorInstruction<
  Type extends TerminatorInstructionType,
  Operands extends Array<Value>,
> = BaseInstruction<Type, Operands>;

export type TerminatorInstruction =
  | BranchingInstruction
  | ConditionalBranchingInstruction
  | ReturnInstruction;

export const createTerminatorInstruction = <
  Type extends TerminatorInstructionType,
  Operands extends Array<Value>,
>(
  instructionType: Type,
  operands: Operands,
  location: Location,
): BaseTerminatorInstruction<Type, Operands> => {
  return {
    ...createInstruction(instructionType, operands, location),
  };
};

export const isATerminatorInstruction = (
  instruction: Instruction,
): instruction is TerminatorInstruction => {
  return terminatorInstructionTypes.includes((instruction as TerminatorInstruction).type);
};
