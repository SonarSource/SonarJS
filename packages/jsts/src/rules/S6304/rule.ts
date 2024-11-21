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
// https://sonarsource.github.io/rspec/#/rspec/S6304/javascript

import type { Rule } from 'eslint';
import { Node } from 'estree';
import { generateMeta, report, StringLiteral, toSecondaryLocation } from '../helpers/index.js';
import { getResultOfExpression, Result } from '../helpers/result.js';
import {
  AwsIamPolicyTemplate,
  getSensitiveEffect,
  isAnyLiteral,
  PolicyCheckerOptions,
} from '../helpers/aws/iam.js';
import { meta } from './meta.js';

const MESSAGES = {
  message: 'Make sure granting access to all resources is safe here.',
  secondary: 'Related effect',
};

const KMS_PREFIX = 'kms:';

export const rule: Rule.RuleModule = AwsIamPolicyTemplate(
  allResourcesAccessibleStatementCheck,
  generateMeta(meta as Rule.RuleMetaData, undefined, true),
);

function allResourcesAccessibleStatementCheck(
  expr: Node,
  ctx: Rule.RuleContext,
  options: PolicyCheckerOptions,
) {
  const properties = getResultOfExpression(ctx, expr);
  const effect = getSensitiveEffect(properties, ctx, options);
  const resource = getSensitiveResource(properties, options);

  if (isException(properties, options)) {
    return;
  }

  if (effect.isMissing && resource) {
    report(ctx, {
      message: MESSAGES.message,
      node: resource,
    });
  } else if (effect.isFound && resource) {
    report(
      ctx,
      {
        message: MESSAGES.message,
        node: resource,
      },
      [toSecondaryLocation(effect.node, MESSAGES.secondary)],
    );
  }
}

function isException(properties: Result, options: PolicyCheckerOptions) {
  return properties.getProperty(options.actions.property).everyStringLiteral(isKmsAction);
}

function isKmsAction(action: StringLiteral) {
  return action.value.startsWith(KMS_PREFIX);
}

function getSensitiveResource(properties: Result, options: PolicyCheckerOptions) {
  return getSensitiveResources(properties, options).find(isAnyLiteral);
}

function getSensitiveResources(properties: Result, options: PolicyCheckerOptions) {
  return properties.getProperty(options.resources.property).asStringLiterals();
}
