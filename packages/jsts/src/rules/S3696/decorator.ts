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
// https://sonarsource.github.io/rspec/#/rspec/S3696/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta, interceptReport, isBinaryPlus, isStringLiteral } from '../helpers/index.js';
import { meta } from './meta.js';

// core implementation of this rule does not provide quick fixes
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta as Rule.RuleMetaData, {
        ...rule.meta!,
        hasSuggestions: true,
      }),
    },
    (context, reportDescriptor) => {
      const suggest: Rule.SuggestionReportDescriptor[] = [];
      if ('node' in reportDescriptor) {
        const { argument: thrown } = reportDescriptor.node as estree.ThrowStatement;
        if (isStringLike(thrown)) {
          const thrownText = context.sourceCode.getText(thrown);
          suggest.push({
            desc: 'Throw an error object',
            fix: fixer => fixer.replaceText(thrown, `new Error(${thrownText})`),
          });
        }
      }
      context.report({
        ...reportDescriptor,
        suggest,
      });
    },
  );
}

function isStringLike(node: estree.Node): boolean {
  return isStringLiteral(node) || isStringConcatenation(node);
}

function isStringConcatenation(node: estree.Node): boolean {
  return isBinaryPlus(node) && (isStringLike(node.left) || isStringLike(node.right));
}
