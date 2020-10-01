/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import {
  getModuleNameOfNode,
  getObjectExpressionProperty,
  getValueOfExpression,
  isIdentifier,
  toEncodedMessage,
} from './utils';

export class AbstractCookieFlagCheck {
  context: Rule.RuleContext;
  flag: string;
  issueMessage: string;

  constructor(context: Rule.RuleContext, flag: string) {
    this.context = context;
    this.flag = flag;
    this.issueMessage = `Make sure creating this cookie without the "${flag}" flag is safe.`;
  }

  private checkCookieSession(callExpression: estree.CallExpression) {
    // Sensitive argument for cookie session is first one
    this.checkSensitiveCookieArgument(callExpression, 0);
  }

  private checkCookiesMethodCall(callExpression: estree.CallExpression) {
    if (!isIdentifier((callExpression.callee as estree.MemberExpression).property, 'set')) {
      return;
    }
    // Sensitive argument is third argument for "cookies.set" calls
    this.checkSensitiveCookieArgument(callExpression, 2);
  }

  private checkCsurf(callExpression: estree.CallExpression) {
    // Sensitive argument is first for csurf
    const cookieProperty = this.checkSensitiveObjectArgument(callExpression, 0);
    if (cookieProperty) {
      // csurf cookie property can be passed as a boolean literal, in which case neither "secure" nor "httponly" are enabled by default
      const cookiePropertyLiteral = getValueOfExpression<estree.Literal>(
        this.context,
        cookieProperty.value,
        'Literal',
      );
      if (cookiePropertyLiteral?.value === true) {
        this.context.report({
          node: callExpression.callee,
          message: toEncodedMessage(this.issueMessage, [cookiePropertyLiteral]),
        });
      }
    }
  }

  private checkExpressSession(callExpression: estree.CallExpression) {
    // Sensitive argument is first for express-session
    this.checkSensitiveObjectArgument(callExpression, 0);
  }

  private checkSensitiveCookieArgument(
    callExpression: estree.CallExpression,
    sensitiveArgumentIndex: number,
  ) {
    if (callExpression.arguments.length < sensitiveArgumentIndex + 1) {
      return;
    }
    const sensitiveArgument = callExpression.arguments[sensitiveArgumentIndex];
    const cookieObjectExpression = getValueOfExpression<estree.ObjectExpression>(
      this.context,
      sensitiveArgument,
      'ObjectExpression',
    );
    if (!cookieObjectExpression) {
      return;
    }
    this.checkFlagOnCookieExpression(
      cookieObjectExpression,
      sensitiveArgument,
      cookieObjectExpression,
      callExpression,
    );
  }

  private checkSensitiveObjectArgument(
    callExpression: estree.CallExpression,
    argumentIndex: number,
  ): estree.Property | undefined {
    if (callExpression.arguments.length < argumentIndex + 1) {
      return;
    }
    const firstArgument = callExpression.arguments[argumentIndex];
    const objectExpression = getValueOfExpression<estree.ObjectExpression>(
      this.context,
      firstArgument,
      'ObjectExpression',
    );
    if (!objectExpression) {
      return;
    }
    const cookieProperty = getObjectExpressionProperty(objectExpression, 'cookie');
    if (!cookieProperty) {
      return;
    }
    const cookiePropertyValue = getValueOfExpression<estree.ObjectExpression>(
      this.context,
      cookieProperty.value,
      'ObjectExpression',
    );
    if (cookiePropertyValue) {
      this.checkFlagOnCookieExpression(
        cookiePropertyValue,
        firstArgument,
        objectExpression,
        callExpression,
      );
      return;
    }
    return cookieProperty;
  }

  private checkFlagOnCookieExpression(
    cookiePropertyValue: estree.ObjectExpression,
    firstArgument: estree.Node,
    objectExpression: estree.ObjectExpression,
    callExpression: estree.CallExpression,
  ) {
    const flagProperty = getObjectExpressionProperty(cookiePropertyValue, this.flag);
    if (flagProperty) {
      const flagPropertyValue = getValueOfExpression<estree.Literal>(
        this.context,
        flagProperty.value,
        'Literal',
      );
      if (flagPropertyValue?.value === false) {
        const secondaryLocations: estree.Node[] = [flagPropertyValue];
        if (firstArgument !== objectExpression) {
          secondaryLocations.push(objectExpression);
        }
        this.context.report({
          node: callExpression.callee,
          message: toEncodedMessage(this.issueMessage, secondaryLocations),
        });
      }
    }
  }

  public checkCookiesFromCallExpression(node: estree.Node) {
    const callExpression = node as estree.CallExpression;
    const { callee } = callExpression;
    const moduleName = getModuleNameOfNode(this.context, callee);
    if (moduleName?.value === 'cookie-session') {
      this.checkCookieSession(callExpression);
      return;
    }
    if (moduleName?.value === 'csurf') {
      this.checkCsurf(callExpression);
      return;
    }
    if (moduleName?.value === 'express-session') {
      this.checkExpressSession(callExpression);
      return;
    }
    if (callee.type === 'MemberExpression') {
      const objectValue = getValueOfExpression<estree.NewExpression>(
        this.context,
        callee.object,
        'NewExpression',
      );
      if (objectValue) {
        const module = getModuleNameOfNode(this.context, objectValue.callee);
        if (module?.value === 'cookies') {
          this.checkCookiesMethodCall(callExpression);
        }
      }
    }
  }
}
