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
// https://sonarsource.github.io/rspec/#/rspec/S7060/javascript

import { Rule } from 'eslint';
import { generateMeta, interceptReport } from '../helpers';
import { meta } from './meta';
import * as estree from 'estree';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta as Rule.RuleMetaData, {
        ...rule.meta!,
        hasSuggestions: true,
      }),
    },
    reportWithQuickFix,
  );
}

function reportWithQuickFix(context: Rule.RuleContext, reportDescriptor: Rule.ReportDescriptor) {
  if (!('node' in reportDescriptor)) {
    return;
  }
  const { node } = reportDescriptor;
  let suggestion: Rule.SuggestionReportDescriptor | undefined;
  if (node.type === 'ImportDeclaration') {
    suggestion = {
      desc: 'Remove this import',
      fix: fixer => fixer.remove(node),
    };
  } else if (node.type === 'CallExpression') {
    const variableDecl = findRequireVariableDeclaration(node);
    if (variableDecl) {
      suggestion = {
        desc: 'Remove this require',
        fix: fixer => fixer.remove(variableDecl),
      };
    }
  }
  const rd = suggestion ? { ...reportDescriptor, suggest: [suggestion] } : reportDescriptor;
  context.report(rd);
}

function findRequireVariableDeclaration(node: estree.Node) {
  const parent = getParent(getParent(node));
  if (parent.type === 'VariableDeclaration') {
    return parent;
  }
  return undefined;
}

function getParent(node: estree.Node): estree.Node {
  // @ts-ignore
  return node.parent as estree.Node;
}
