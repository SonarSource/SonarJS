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
import type { Instruction } from './instruction';
import type { Location } from './location';

export type Block = {
  readonly exceptionHandler?: Block;
  readonly identifier: number;
  readonly instructions: Array<Instruction>;
  readonly isLoopCondition: boolean; // todo: what is this?
  readonly location: Location;
  readonly loopId: number | null;
  readonly parentLoopId: number | null;
};

export const createBlock = (identifier: number, location: Location): Block => {
  return {
    exceptionHandler: undefined,
    identifier,
    instructions: [],
    isLoopCondition: false,
    location,
    loopId: null,
    parentLoopId: null,
  };
};
