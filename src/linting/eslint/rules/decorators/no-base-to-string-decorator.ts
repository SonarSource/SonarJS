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
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { Rule } from 'eslint';
import { isRequiredParserServices, RequiredParserServices } from '../helpers';
import { interceptReport } from './helpers';

export function decorateNoBaseToString(rule: Rule.RuleModule): Rule.RuleModule {
  // maybe call sanitizeTSrule()
  return interceptReport(rule, (context, reportDescriptor) => {
    if ('node' in reportDescriptor) {
      const services = context.parserServices;
      const hasTypeInformation = isRequiredParserServices(services);
      if (hasTypeInformation && isGenericType(reportDescriptor.node as TSESTree.Node, services)) {
        // we skip
      } else {
        context.report(reportDescriptor);
      }
    }
  });
}

function isGenericType(node: TSESTree.Node, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  const type = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node));
  return type.isTypeParameter();
}
