/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S1788/javascript

import type { Rule } from 'eslint';
import type { AssignmentPattern, BaseFunction } from 'estree';
import { generateMeta, interceptReport, isIdentifier } from '../helpers/index.js';
import * as meta from './generated-meta.js';

const NUM_ARGS_REDUX_REDUCER = 2;

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, { ...rule.meta, schema: undefined }),
    },
    reportExempting(isReduxReducer),
  );
}

function reportExempting(
  exemptionCondition: (enclosingFunction: BaseFunction) => boolean,
): (context: Rule.RuleContext, reportDescriptor: Rule.ReportDescriptor) => void {
  return (context, reportDescriptor) => {
    if ('node' in reportDescriptor) {
      const node = reportDescriptor['node'] as AssignmentPattern;
      const scope = context.sourceCode.getScope(node);
      const variable = scope.variables.find(value => isIdentifier(node.left, value.name));
      const enclosingFunction = variable?.defs?.[0]?.node as BaseFunction;
      if (enclosingFunction && !exemptionCondition(enclosingFunction)) {
        context.report(reportDescriptor);
      }
    }
  };
}

function isReduxReducer(enclosingFunction: BaseFunction) {
  if (enclosingFunction.params.length === NUM_ARGS_REDUX_REDUCER) {
    const [firstParam, secondParam] = enclosingFunction.params;
    return (
      firstParam.type === 'AssignmentPattern' &&
      isIdentifier(firstParam.left, 'state') &&
      isIdentifier(secondParam, 'action')
    );
  }
  return false;
}
