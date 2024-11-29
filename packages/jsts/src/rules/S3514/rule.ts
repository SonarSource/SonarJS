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
// https://sonarsource.github.io/rspec/#/rspec/S3514/javascript

import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import estree from 'estree';
import {
  findFirstMatchingAncestor,
  generateMeta,
  isIdentifier,
  isNumberLiteral,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import { meta } from './meta.js';

const MAX_INDEX = 4;
const isAllowedIndex = (idx: number) => idx >= 0 && idx <= MAX_INDEX;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, undefined, true),

  create(context: Rule.RuleContext) {
    function visitStatements(statements: Array<estree.Statement | estree.ModuleDeclaration>) {
      const declarationsByObject: Map<string, estree.VariableDeclarator[]> = new Map();

      for (const statement of statements) {
        if (statement.type === 'VariableDeclaration') {
          visitDeclarations(declarationsByObject, statement.declarations);
        } else {
          checkDeclarationsBlock(declarationsByObject);
          declarationsByObject.clear();
        }
      }
      checkDeclarationsBlock(declarationsByObject);
    }

    function visitDeclarations(
      declarationsByObject: Map<string, estree.VariableDeclarator[]>,
      declarations: Array<estree.VariableDeclarator>,
    ) {
      for (const declaration of declarations) {
        const id = declaration.id;
        if (declaration.init && id.type === 'Identifier') {
          const varName = id.name;
          const expression = declaration.init;
          if (expression.type !== 'MemberExpression') {
            continue;
          }
          const property = expression.property;
          if (
            isIdentifier(property, varName) ||
            (isNumberLiteral(property) && isAllowedIndex(property.value))
          ) {
            addDeclaration(declarationsByObject, expression.object, declaration);
          }
        }
      }
    }

    function addDeclaration(
      declarationsByObject: Map<string, estree.VariableDeclarator[]>,
      object: estree.Node,
      declaration: estree.VariableDeclarator,
    ) {
      const key = context.sourceCode.getText(object);
      const value = declarationsByObject.get(key);
      if (value) {
        value.push(declaration);
      } else {
        declarationsByObject.set(key, [declaration]);
      }
    }

    function checkDeclarationsBlock(
      declarationsByObject: Map<string, estree.VariableDeclarator[]>,
    ) {
      declarationsByObject.forEach((declarations: estree.VariableDeclarator[], key: string) => {
        if (declarations.length > 1) {
          const firstKind = getKind(declarations[0]);
          const tail = declarations.slice(1);
          if (tail.every(decl => getKind(decl) === firstKind)) {
            report(
              context,
              {
                node: declarations[0],
                message: `Use destructuring syntax for these assignments from "${key}".`,
              },
              tail.map(node => toSecondaryLocation(node, 'Replace this assignment.')),
            );
          }
        }
      });
    }

    return {
      BlockStatement: (node: estree.Node) => {
        visitStatements((node as estree.BlockStatement).body);
      },
      SwitchCase: (node: estree.Node) => {
        visitStatements((node as estree.SwitchCase).consequent);
      },
      Program: (node: estree.Node) => {
        visitStatements((node as estree.Program).body);
      },
    };
  },
};

function getKind(declarator: estree.VariableDeclarator) {
  const declaration = findFirstMatchingAncestor(
    declarator as TSESTree.Node,
    n => n.type === 'VariableDeclaration',
  ) as estree.VariableDeclaration | undefined;
  return declaration?.kind;
}
