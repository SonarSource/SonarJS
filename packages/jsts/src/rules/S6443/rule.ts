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
// https://sonarsource.github.io/rspec/#/rspec/S6443/javascript

import { Rule, Scope } from 'eslint';
import { generateMeta, getFullyQualifiedName, getVariableFromName } from '../helpers/index.js';
import estree from 'estree';
import * as meta from './meta.js';

type Reference = {
  setter: Scope.Variable | undefined;
  value: Scope.Variable | undefined;
};

const declarationSelector = [
  ':matches(',
  [
    'VariableDeclarator[init.callee.name="useState"]',
    'VariableDeclarator[init.callee.object.type="Identifier"][init.callee.property.name="useState"]',
  ].join(','),
  ')',
  '[id.type="ArrayPattern"]',
  '[id.elements.length=2]',
  '[id.elements.0.type="Identifier"]',
  '[id.elements.1.type="Identifier"]',
].join('');

const callSelector = [
  'CallExpression[callee.type="Identifier"]',
  '[arguments.length=1]',
  '[arguments.0.type="Identifier"]',
].join('');

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      uselessSetState: 'Change the argument of this setter to not use its matching state variable',
    },
  }),
  create(context: Rule.RuleContext) {
    const referencesBySetterName: { [key: string]: Reference } = {};

    return {
      [declarationSelector](node: estree.VariableDeclarator) {
        if (isReactCall(context, node.init as estree.CallExpression)) {
          const { elements } = node.id as estree.ArrayPattern;
          const setter = (elements[1] as estree.Identifier).name;
          referencesBySetterName[setter] = {
            setter: getVariableFromName(context, setter, node),
            value: getVariableFromName(context, (elements[0] as estree.Identifier).name, node),
          };
        }
      },
      [callSelector](node: estree.CallExpression) {
        const setter = getVariableFromName(context, (node.callee as estree.Identifier).name, node);
        const value = getVariableFromName(
          context,
          (node.arguments[0] as estree.Identifier).name,
          node,
        );
        const key = setter?.name as string;
        if (
          setter &&
          value &&
          referencesBySetterName.hasOwnProperty(key) &&
          referencesBySetterName[key].setter === setter &&
          referencesBySetterName[key].value === value
        ) {
          context.report({
            messageId: 'uselessSetState',
            node,
          });
        }
      },
    };
  },
};

function isReactCall(context: Rule.RuleContext, callExpr: estree.CallExpression): boolean {
  const fqn = getFullyQualifiedName(context, callExpr);
  if (fqn) {
    const [module] = fqn.split('.');
    return module === 'react';
  }
  return false;
}
