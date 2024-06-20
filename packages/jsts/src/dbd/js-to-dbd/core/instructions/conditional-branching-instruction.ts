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
import type { Block } from '../block';
import {
  type BaseTerminatorInstruction,
  createTerminatorInstruction,
} from './terminator-instruction';
import type { Value } from '../value';
import type { Location } from '../location';

export type ConditionalBranchingInstruction = BaseTerminatorInstruction<
  'conditional_branching',
  [Value]
> & {
  readonly consequentBlock: Block;
  readonly alternateBlock: Block;
};

export const createConditionalBranchingInstruction = (
  condition: Value,
  consequentBlock: Block,
  alternateBlock: Block,
  location: Location,
): ConditionalBranchingInstruction => {
  const terminatorInstruction = createTerminatorInstruction<'conditional_branching', [Value]>(
    'conditional_branching',
    [condition],
    location,
  );

  return {
    ...terminatorInstruction,
    consequentBlock,
    alternateBlock,
  };
};
