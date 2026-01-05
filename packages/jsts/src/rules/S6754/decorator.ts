/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import type { ArrayPattern, Node } from 'estree';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, descriptor) => {
      const { node } = descriptor as { node: Node };

      if (node.type === 'ArrayPattern' && isValidUseStatePattern(node)) {
        return;
      }

      context.report(descriptor);
    },
  );
}

function isValidUseStatePattern(node: ArrayPattern): boolean {
  if (node.elements.length === 1) {
    return true;
  }

  const [getter, setter] = node.elements;
  if (getter?.type !== 'Identifier' || setter?.type !== 'Identifier') {
    return false;
  }

  const getterName = getter.name;
  const setterName = setter.name;

  if (!setterName.startsWith('set')) {
    return false;
  }

  const setterSuffix = setterName.substring('set'.length);

  // Standard match: [Foo, setFoo]
  if (setterSuffix === getterName) {
    return true;
  }

  // Exception for "is" prefix: [isReady, setReady] is valid
  // This is more readable than [isReady, setIsReady]
  if (
    getterName.startsWith('is') &&
    getterName.length > 'is'.length &&
    setterSuffix === getterName.substring('is'.length)
  ) {
    return true;
  }

  return false;
}
