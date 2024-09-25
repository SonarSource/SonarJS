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
import { Rule } from 'eslint';
import estree from 'estree';
import {
  isIdentifier,
  getValueOfExpression,
  getFullyQualifiedName,
  getProperty,
  report,
  toSecondaryLocation,
  IssueLocation,
} from './index.js';

export class CookieFlagCheck {
  issueMessage: string;

  constructor(
    readonly context: Rule.RuleContext,
    readonly flag: 'httpOnly' | 'secure',
  ) {
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
      // csurf cookie property can be passed as a boolean literal,
      // in which case neither "secure" nor "httponly" are enabled by default
      const cookiePropertyLiteral = getValueOfExpression(
        this.context,
        cookieProperty.value,
        'Literal',
      );
      if (cookiePropertyLiteral?.value === true) {
        report(
          this.context,
          {
            node: callExpression.callee,
            message: this.issueMessage,
          },
          [toSecondaryLocation(cookiePropertyLiteral)],
        );
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
    const cookieObjectExpression = getValueOfExpression(
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
    const objectExpression = getValueOfExpression(this.context, firstArgument, 'ObjectExpression');
    if (!objectExpression) {
      return;
    }
    const cookieProperty = getProperty(objectExpression, 'cookie', this.context);
    if (!cookieProperty) {
      return;
    }
    const cookiePropertyValue = getValueOfExpression(
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
    const flagProperty = getProperty(cookiePropertyValue, this.flag, this.context);
    if (flagProperty) {
      const flagPropertyValue = getValueOfExpression(this.context, flagProperty.value, 'Literal');
      if (flagPropertyValue?.value === false) {
        const secondaryLocations: IssueLocation[] = [toSecondaryLocation(flagPropertyValue)];
        if (firstArgument !== objectExpression) {
          secondaryLocations.push(toSecondaryLocation(objectExpression));
        }
        report(
          this.context,
          {
            node: callExpression.callee,
            message: this.issueMessage,
          },
          secondaryLocations,
        );
      }
    }
  }

  public checkCookiesFromCallExpression(node: estree.Node) {
    const callExpression = node as estree.CallExpression;
    const { callee } = callExpression;
    const fqn = getFullyQualifiedName(this.context, callee);
    if (fqn === 'cookie-session') {
      this.checkCookieSession(callExpression);
      return;
    }
    if (fqn === 'csurf') {
      this.checkCsurf(callExpression);
      return;
    }
    if (fqn === 'express-session') {
      this.checkExpressSession(callExpression);
      return;
    }
    if (callee.type === 'MemberExpression') {
      const objectValue = getValueOfExpression(this.context, callee.object, 'NewExpression');
      if (objectValue && getFullyQualifiedName(this.context, objectValue.callee) === 'cookies') {
        this.checkCookiesMethodCall(callExpression);
      }
    }
  }
}
