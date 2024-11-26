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
// https://sonarsource.github.io/rspec/#/rspec/S2703/javascript

import type { Rule } from 'eslint';
import { flatMap, generateMeta, globalsByLibraries } from '../helpers/index.js';
import estree from 'estree';
import { meta } from './meta.js';

const excludedNames = new Set(flatMap(Object.values(globalsByLibraries), globals => globals));

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      explicitModifier:
        'Add the "let", "const" or "var" keyword to this declaration of "{{variable}}" to make it explicit.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      'Program:exit'(node: estree.Node) {
        const globalScope = context.sourceCode.getScope(node);
        const alreadyReported: Set<string> = new Set();
        globalScope.through
          .filter(ref => ref.isWrite())
          .forEach(ref => {
            const name = ref.identifier.name;
            if (!alreadyReported.has(name) && !excludedNames.has(name)) {
              alreadyReported.add(name);
              context.report({
                messageId: 'explicitModifier',
                data: {
                  variable: name,
                },
                node: ref.identifier,
              });
            }
          });
      },
    };
  },
};
