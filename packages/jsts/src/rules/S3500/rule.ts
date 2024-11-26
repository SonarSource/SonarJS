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
// https://sonarsource.github.io/rspec/#/rspec/S3500/javascript

import { Rule, Scope } from 'eslint';
import estree from 'estree';
import { generateMeta, report, toSecondaryLocation } from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, undefined, true),
  create(context: Rule.RuleContext) {
    return {
      'VariableDeclaration[kind="const"]': (node: estree.Node) => {
        context.sourceCode.getDeclaredVariables(node).forEach(variable =>
          variable.references.filter(isModifyingReference).forEach(reference =>
            report(
              context,
              {
                message: `Correct this attempt to modify "${reference.identifier.name}" or use "let" in its declaration.`,
                node: reference.identifier,
              },
              [toSecondaryLocation(node, 'Const declaration')],
            ),
          ),
        );
      },
    };
  },
};

function isModifyingReference(
  reference: Scope.Reference,
  index: number,
  references: Scope.Reference[],
) {
  const identifier = reference.identifier;
  const modifyingDifferentIdentifier =
    index === 0 || references[index - 1].identifier !== identifier;
  return (
    identifier && reference.init === false && reference.isWrite() && modifyingDifferentIdentifier
  );
}
