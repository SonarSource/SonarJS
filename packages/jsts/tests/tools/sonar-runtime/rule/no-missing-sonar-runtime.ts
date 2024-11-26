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
import estree from 'estree';
import type { Rule } from 'eslint';
import {
  getFullyQualifiedName,
  getImportDeclarations,
  getUniqueWriteUsage,
  isIdentifier,
} from '../../../../src/rules/index.js';

/**
 *
 */
export const ruleId = 'no-missing-sonar-runtime';

/**
 * This rule is applied to our own code in the `src/rules` directory.
 * It checks whether the `sonar-runtime` is set for rules that obviously use the
 * `toEncodedMessage` method (which encodes secondary locations).
 */
export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    let isSecondaryLocationUsed = false;
    let isSecondaryLocationEnabled = false;
    return {
      CallExpression: (node: estree.Node) => {
        const { callee } = node as estree.CallExpression;
        if (callee.type === 'Identifier' && callee.name === 'AwsIamPolicyTemplate') {
          isSecondaryLocationEnabled = true;
        }

        if (isSecondaryLocationUsed) {
          return;
        }
        if (callee.type === 'Identifier' && callee.name === 'toEncodedMessage') {
          isSecondaryLocationUsed =
            getModuleNameOfImportedIdentifier(context, callee) === '../helpers';
        }
      },
      Identifier: (node: estree.Identifier) => {
        if (isSecondaryLocationEnabled) {
          return;
        }
        isSecondaryLocationEnabled = node.name === 'SONAR_RUNTIME';
      },
      'Program:exit': (node: estree.Node) => {
        if (isSecondaryLocationUsed && !isSecondaryLocationEnabled) {
          context.report({
            message: `Missing enabling of secondary location support`,
            node,
          });
        }
      },
    };
  },
};

/**
 * Returns the module name, when an identifier represents a binding imported from another module.
 * Returns undefined otherwise.
 * example: Given `import { f } from 'module_name'`, `getModuleNameOfImportedIdentifier(f)` returns `module_name`
 */
function getModuleNameOfImportedIdentifier(
  context: Rule.RuleContext,
  identifier: estree.Identifier,
) {
  // check if importing using `import { f } from 'module_name'`
  const importedDeclaration = getImportDeclarations(context).find(({ specifiers }) =>
    specifiers.some(
      spec => spec.type === 'ImportSpecifier' && spec.imported.name === identifier.name,
    ),
  );
  if (importedDeclaration) {
    return importedDeclaration.source.value;
  }
  // check if importing using `const f = require('module_name').f` or `const { f } = require('module_name')`
  const writeExpression = getUniqueWriteUsage(context, identifier.name, identifier);
  if (writeExpression) {
    let maybeRequireCall: estree.Node;
    if (
      writeExpression.type === 'MemberExpression' &&
      isIdentifier(writeExpression.property, identifier.name)
    ) {
      maybeRequireCall = writeExpression.object;
    } else {
      maybeRequireCall = writeExpression;
    }
    const fqn = getFullyQualifiedName(context, maybeRequireCall);
    return fqn?.split('.')[0];
  }

  return undefined;
}
