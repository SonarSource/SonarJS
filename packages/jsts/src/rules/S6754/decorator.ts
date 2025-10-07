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
// https://sonarsource.github.io/rspec/#/rspec/S6754/javascript

import type { Rule } from 'eslint';
import { generateMeta, interceptReportForReact } from '../helpers/index.js';
import * as meta from './generated-meta.js';
import type { Node } from 'estree';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, descriptor) => {
      const { node } = descriptor as {
        node: Node;
      };

      if (node.type === 'ArrayPattern') {
        if (node.elements.length === 1) {
          return;
        }

        const [getter, setter] = node.elements;

        if (getter?.type === 'Identifier' && setter?.type === 'Identifier') {
          const getterName = getter.name;
          const setterName = setter.name;
          const setterPrefix = 'set';

          if (
            setterName.startsWith(setterPrefix) &&
            setterName.substring(setterPrefix.length) === getterName
          ) {
            return;
          }
        }
      }

      context.report(descriptor);
    },
  );
}
