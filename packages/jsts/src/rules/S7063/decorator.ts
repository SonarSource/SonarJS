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
import { AST, Rule } from 'eslint';
import { generateMeta, interceptReport } from '../helpers';
import { meta } from './meta';

/**
 * We only allow for the rule to be generated iff there is an 'export' statement
 */

const EXPORT_STATEMENTS = [
  'ExportNamedDeclaration',
  'ExportDefaultDeclaration',
  'ExportAllDeclaration',
];

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta as Rule.RuleMetaData, { ...rule.meta! }),
    },
    (context, reportDescriptor) => {
      const program = context.sourceCode.ast;
      if (!hasExport(program)) {
        return;
      }
      context.report({ ...reportDescriptor });
    },
  );
}

function hasExport(program: AST.Program): boolean {
  return program.body.filter(node => EXPORT_STATEMENTS.includes(node.type)).length > 0;
}
