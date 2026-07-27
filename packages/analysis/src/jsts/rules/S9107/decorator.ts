/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S9107/javascript

import type { Rule } from 'eslint';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import * as meta from './generated-meta.js';

const IDENTIFIER_PATTERN = /^[A-Z][A-Za-z0-9_$]*$/;

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      if ('messageId' in reportDescriptor && reportDescriptor.messageId === 'propTypeConstructor') {
        const { messageId: _messageId, fix, ...rest } = reportDescriptor;
        context.report({
          ...rest,
          fix: fix && withSafeIdentifierFix(fix),
          message: `Replace this value with a constructor, e.g. String or Number, for the "{{name}}" prop's type.`,
        });
      } else {
        context.report(reportDescriptor);
      }
    },
  );
}

/**
 * The upstream fixer replaces a string/template literal type with its raw text value
 * (e.g. 'String' -> String) without checking it's a valid identifier. For a value like
 * 'not-a-real-type' that produces broken code (`not - a - real - type`). Skip the fix
 * whenever the replacement text isn't a plain identifier. Requiring an uppercase first
 * letter also rules out reserved words like 'class' or 'default', which would otherwise
 * match as valid identifiers but produce invalid code when substituted in.
 */
function withSafeIdentifierFix(fix: Rule.ReportFixer): Rule.ReportFixer {
  return fixer => {
    const result = fix(fixer);
    if (result == null) {
      return null;
    }
    const edits = isSingleFix(result) ? [result] : Array.from(result);
    return edits.every(edit => IDENTIFIER_PATTERN.test(edit.text)) ? result : null;
  };
}

function isSingleFix(value: Rule.Fix | Iterable<Rule.Fix>): value is Rule.Fix {
  return !(Symbol.iterator in Object(value));
}
