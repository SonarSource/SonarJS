/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
import { Rule } from 'eslint';
import * as estree from 'estree';
import { interceptReport } from './helpers';

export function decorateNoUnnecessaryTypeAssertion(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(rule, doNothing());
}

function doNothing(
): (context: Rule.RuleContext, reportDescriptor: Rule.ReportDescriptor) => void {
  return (context, reportDescriptor) => {
    const node = (reportDescriptor as any).node as estree.Node;
    const parserServices = context.parserServices;
    const checker = parserServices.program.getTypeChecker();
    const originalNode = parserServices.esTreeNodeToTSNodeMap.get(node);
    const castType = checker.getTypeAtLocation(parserServices.esTreeNodeToTSNodeMap.get((node as any).typeAnnotation));
    const uncastType = checker.getTypeAtLocation(originalNode.expression);
    checker.isTypeAssignableTo(uncastType, castType)
    if (castType === uncastType) {
      console.log('walou');
    }

    context.getSourceCode().getLastToken(originalNode);
    context.report(reportDescriptor);
  };
}
