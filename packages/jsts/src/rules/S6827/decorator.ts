/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
import { generateMeta, interceptReport } from '../helpers/index.js';
import pkg from 'jsx-ast-utils-x';
const { hasAnyProp } = pkg;
import type { JSXOpeningElement } from 'estree-jsx';
import * as meta from './generated-meta.js';

/**
 * This fix was introduced in eslint-plugin-jsx-a11y e6bfd5cb7c,
 * but the last release is almost a year old, so it doesn't include this.
 * When we update the dependency, we can remove this decorator.
 *
 * This will include the removal of:
 * - the `jsx-ast-utils` dependency
 * - all files in the `rules/S6827/` directory
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, {
        ...rule.meta!,
      }),
    },
    (context, reportDescriptor) => {
      const node = (reportDescriptor as any).node as JSXOpeningElement;

      if (hasAnyProp(node.attributes, ['title', 'aria-label'])) {
        return;
      }
      context.report({ ...reportDescriptor });
    },
  );
}
