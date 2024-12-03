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
import type { Rule } from 'eslint';
import { isRequiredParserServices } from '../../helpers/index.js';

/**
 * Sanitizes a TypeScript ESLint rule
 *
 * TypeScript ESLint rules that relies on TypeScript's type system unconditionally assumes
 * that the type checker is always available. Linting a source code with such rules could
 * lead to a runtime error if that assumption turned out to be wrong for whatever reason.
 *
 * Aa TypeScript ESLint rule needs, therefore, to be sanitized in case its implementation
 * relies on type checking. The metadata of such a rule sets the `requiresTypeChecking`
 * property to `true`.
 *
 * The sanitization of a rule is nothing more than a decoration of its implementation. It
 * determines whether the rule uses type checking and checks whether type information is
 * available at runtime. If so, the execution of the rule proceeds; otherwise, it stops.
 *
 * @param rule a TypeScript ESLint rule to sanitize
 * @returns the sanitized rule
 */
export function sanitize(rule: Rule.RuleModule): Rule.RuleModule {
  return {
    ...(!!rule.meta && { meta: rule.meta }),
    create(context: Rule.RuleContext) {
      /**
       * Overrides the rule behaviour if it requires TypeScript's type checker
       * but type information is missing.
       */
      if (
        rule.meta?.docs &&
        (rule.meta.docs as any).requiresTypeChecking === true &&
        !isRequiredParserServices(context.sourceCode.parserServices)
      ) {
        return {};
      }
      return rule.create(context);
    },
  };
}
