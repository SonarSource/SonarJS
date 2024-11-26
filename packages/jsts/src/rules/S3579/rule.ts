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
// https://sonarsource.github.io/rspec/#/rspec/S3579/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta, isArray, isRequiredParserServices, isString } from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      noAssociativeArray:
        'Make it an object if it must have named properties; otherwise, use a numeric index here.',
    },
  }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;

    if (!isRequiredParserServices(services)) {
      return {};
    }

    return {
      'AssignmentExpression[left.type="MemberExpression"]'(node: estree.Node) {
        const { property, object } = (node as estree.AssignmentExpression)
          .left as estree.MemberExpression;
        if (isString(property, services) && isArray(object, services)) {
          context.report({
            messageId: 'noAssociativeArray',
            node,
          });
        }
      },
    };
  },
};
