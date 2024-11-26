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
// https://sonarsource.github.io/rspec/#/rspec/S5743/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { checkSensitiveCall, generateMeta, getFullyQualifiedName } from '../helpers/index.js';
import { meta } from './meta.js';

const MESSAGE = 'Make sure allowing browsers to perform DNS prefetching is safe here.';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, undefined, true),
  create(context: Rule.RuleContext) {
    return {
      CallExpression: (node: estree.Node) => {
        const callExpression = node as estree.CallExpression;
        const fqn = getFullyQualifiedName(context, callExpression);
        if (fqn === 'helmet.dnsPrefetchControl') {
          checkSensitiveCall(context, callExpression, 0, 'allow', true, MESSAGE);
        }
        if (fqn === 'helmet') {
          checkSensitiveCall(context, callExpression, 0, 'dnsPrefetchControl', false, MESSAGE);
        }
        if (fqn === 'dns-prefetch-control') {
          checkSensitiveCall(context, callExpression, 0, 'allow', true, MESSAGE);
        }
      },
    };
  },
};
