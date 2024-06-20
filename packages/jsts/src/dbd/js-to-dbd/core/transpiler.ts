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
import { createFunctionInfo, type FunctionInfo } from './function-info';
import { createScopeManager } from './scope-manager';
import { Rule } from 'eslint';
import { relative } from 'path';
import { SourceCode } from '@typescript-eslint/utils/ts-eslint';

export type Transpiler = (context: Rule.RuleContext, rootDir: string) => Array<FunctionInfo>;

export const createTranspiler = (): Transpiler => {
  return (ruleContext: Rule.RuleContext, rootDir: string) => {
    const fileName = relative(rootDir, ruleContext.filename);
    const sourceCode = ruleContext.sourceCode as unknown as SourceCode;
    const { ast } = sourceCode;
    const scopeManager = createScopeManager(sourceCode, fileName);

    // create the function info
    createFunctionInfo('main', ast, scopeManager);

    return scopeManager.functionInfos;
  };
};
