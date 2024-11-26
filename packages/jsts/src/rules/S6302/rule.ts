/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S6302/javascript

import type { Rule } from 'eslint';
import { Node } from 'estree';
import { getResultOfExpression, Result } from '../helpers/result.js';
import {
  AwsIamPolicyTemplate,
  getSensitiveEffect,
  isAnyLiteral,
  PolicyCheckerOptions,
} from '../helpers/aws/iam.js';
import { generateMeta, report, toSecondaryLocation } from '../helpers/index.js';
import { meta } from './meta.js';

const MESSAGES = {
  message: 'Make sure granting all privileges is safe here.',
  secondary: 'Related effect',
};

export const rule: Rule.RuleModule = AwsIamPolicyTemplate(
  allPrivilegesStatementChecker,
  generateMeta(meta as Rule.RuleMetaData, undefined, true),
);

function allPrivilegesStatementChecker(
  expr: Node,
  ctx: Rule.RuleContext,
  options: PolicyCheckerOptions,
) {
  const properties = getResultOfExpression(ctx, expr);
  const effect = getSensitiveEffect(properties, ctx, options);
  const action = getSensitiveAction(properties, options);

  if (effect.isMissing && action) {
    report(ctx, {
      message: MESSAGES.message,
      node: action,
    });
  } else if (effect.isFound && action) {
    report(
      ctx,
      {
        message: MESSAGES.message,
        node: action,
      },
      [toSecondaryLocation(effect.node, MESSAGES.secondary)],
    );
  }
}

function getSensitiveAction(properties: Result, options: PolicyCheckerOptions) {
  return getActionLiterals(properties, options).find(isAnyLiteral);
}

function getActionLiterals(properties: Result, options: PolicyCheckerOptions) {
  return properties.getProperty(options.actions.property).asStringLiterals();
}
