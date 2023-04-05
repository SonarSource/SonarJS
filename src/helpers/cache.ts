/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import { LRU } from './lru';
import ts from 'typescript';
import { TSConfig } from './tsconfigs';

export type ProgramResult = {
  tsConfig: TSConfig;
  files: string[];
  projectReferences: string[];
  missingTsConfig: boolean;
  program: WeakRef<ts.Program>;
  isFallbackProgram?: boolean;
};

/**
 * A cache of created TypeScript's Program instances
 *
 * @param programs It associates a program identifier (usually a tsconfig) to an instance of a TypeScript's Program.
 * @param lru Cache to keep strong references to the latest used Programs to avoid GC
 */
export class ProgramCache {
  public programs: Map<string, ProgramResult>;
  public lru: LRU<ts.Program>;
  constructor() {
    this.programs = new Map<string, ProgramResult>();
    this.lru = new LRU<ts.Program>();
  }
  clear() {
    this.programs.clear();
    this.lru.clear();
  }
}
