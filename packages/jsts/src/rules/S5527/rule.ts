/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S5667/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import {
  childrenOf,
  generateMeta,
  getFullyQualifiedName,
  getProperty,
  getPropertyWithValue,
  getValueOfExpression,
  IssueLocation,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
  create(context: Rule.RuleContext) {
    const MESSAGE = 'Enable server hostname verification on this SSL/TLS connection.';
    const SECONDARY_MESSAGE = 'Set "rejectUnauthorized" to "true".';
    function checkSensitiveArgument(
      callExpression: estree.CallExpression,
      sensitiveArgumentIndex: number,
    ) {
      if (callExpression.arguments.length < sensitiveArgumentIndex + 1) {
        return;
      }
      const sensitiveArgument = callExpression.arguments[sensitiveArgumentIndex];
      const secondaryLocations: IssueLocation[] = [];
      let shouldReport = false;
      const argumentValue = getValueOfExpression(context, sensitiveArgument, 'ObjectExpression');
      if (!argumentValue) {
        return;
      }
      if (sensitiveArgument !== argumentValue) {
        secondaryLocations.push(toSecondaryLocation(argumentValue));
      }
      const unsafeRejectUnauthorizedConfiguration = getPropertyWithValue(
        context,
        argumentValue,
        'rejectUnauthorized',
        false,
      );
      if (unsafeRejectUnauthorizedConfiguration) {
        secondaryLocations.push(
          toSecondaryLocation(unsafeRejectUnauthorizedConfiguration, SECONDARY_MESSAGE),
        );
        shouldReport = true;
      }
      const checkServerIdentityProperty = getProperty(
        argumentValue,
        'checkServerIdentity',
        context,
      );
      if (
        checkServerIdentityProperty &&
        shouldReportOnCheckServerIdentityCallBack(checkServerIdentityProperty)
      ) {
        secondaryLocations.push(toSecondaryLocation(checkServerIdentityProperty));
        shouldReport = true;
      }
      if (shouldReport) {
        report(
          context,
          {
            node: callExpression.callee,
            message: MESSAGE,
          },
          secondaryLocations,
        );
      }
    }

    function shouldReportOnCheckServerIdentityCallBack(
      checkServerIdentityProperty: estree.Property,
    ) {
      let baseFunction: estree.BaseFunction | undefined;
      baseFunction = getValueOfExpression(
        context,
        checkServerIdentityProperty.value,
        'FunctionExpression',
      );
      if (!baseFunction) {
        baseFunction = getValueOfExpression(
          context,
          checkServerIdentityProperty.value,
          'ArrowFunctionExpression',
        );
      }
      if (baseFunction?.body.type === 'BlockStatement') {
        const returnStatements = ReturnStatementsVisitor.getReturnStatements(
          baseFunction.body,
          context,
        );
        if (
          returnStatements.length === 0 ||
          returnStatements.every(r => {
            return (
              !r.argument || getValueOfExpression(context, r.argument, 'Literal')?.value === true
            );
          })
        ) {
          return true;
        }
      }
      return false;
    }

    return {
      CallExpression: (node: estree.Node) => {
        const callExpression = node as estree.CallExpression;
        const fqn = getFullyQualifiedName(context, callExpression);
        if (fqn === 'https.request') {
          checkSensitiveArgument(callExpression, 0);
        }
        if (fqn === 'request.get') {
          checkSensitiveArgument(callExpression, 0);
        }
        if (fqn === 'tls.connect') {
          checkSensitiveArgument(callExpression, 2);
        }
      },
    };
  },
};

class ReturnStatementsVisitor {
  private readonly returnStatements: estree.ReturnStatement[] = [];

  static getReturnStatements(node: estree.Node, context: Rule.RuleContext) {
    const visitor = new ReturnStatementsVisitor();
    visitor.visit(node, context);
    return visitor.returnStatements;
  }

  private visit(root: estree.Node, context: Rule.RuleContext) {
    const visitNode = (node: estree.Node) => {
      switch (node.type) {
        case 'ReturnStatement':
          this.returnStatements.push(node);
          break;
        case 'FunctionDeclaration':
        case 'FunctionExpression':
        case 'ArrowFunctionExpression':
          return;
      }
      childrenOf(node, context.sourceCode.visitorKeys).forEach(visitNode);
    };
    visitNode(root);
  }
}
