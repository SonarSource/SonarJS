/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
// https://jira.sonarsource.com/browse/RSPEC-1226

import { Rule, Scope } from "eslint";
import * as estree from "estree";
import { SourceLocation } from "estree";
import { resolveIdentifiers } from "./utils";
import { TSESTree } from "@typescript-eslint/typescript-estree";

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    function checkReferenceReassignment(references: Scope.Reference[], currentScope: Scope.Scope) {
      const firstNonInitReference = references
        .filter(reference => isVariableInsideScope(reference.from, currentScope))
        .find(reference => !reference.init);
      if (
        !!firstNonInitReference &&
        firstNonInitReference.isWrite() &&
        firstNonInitReference.identifier.loc
      ) {
        const location = getPreciseLocation(
          firstNonInitReference.identifier.loc,
          firstNonInitReference,
        );
        context.report({
          message: `Introduce a new variable or use its initial value before reassigning "${
            firstNonInitReference.identifier.name
          }".`,
          loc: location,
        });
      }
    }

    function checkDeclaredVariables(node: estree.Node) {
      const currentScope = context.getScope();
      context
        .getDeclaredVariables(node)
        .forEach(variable => checkReferenceReassignment(variable.references, currentScope));
    }

    function checkDeclaredVariablesOfForStatement(
      node: estree.ForInStatement | estree.ForOfStatement,
    ) {
      const forLoopScope = context.getSourceCode().scopeManager.acquire(node.body);
      if (!forLoopScope) {
        return;
      }

      const declaredVariables = context.getDeclaredVariables(node.left);
      if (declaredVariables.length > 0) {
        declaredVariables.forEach(variable =>
          checkReferenceReassignment(variable.references, forLoopScope),
        );
      } else {
        const identifiersAssignment = resolveIdentifiers(node.left as TSESTree.Node, true);
        const referencesByIdentifiers = forLoopScope.references.reduce(
          (referencesByIdentifiers, currentReference) => {
            const key = currentReference.identifier.name;
            const currentArray = referencesByIdentifiers.get(key);
            if (!currentArray) {
              referencesByIdentifiers.set(key, [currentReference]);
            } else {
              currentArray.push(currentReference);
            }
            return referencesByIdentifiers;
          },
          new Map<string, Scope.Reference[]>(),
        );

        identifiersAssignment.forEach(identifier => {
          const currentIdentifierReferences = referencesByIdentifiers.get(identifier.name);
          if (!!currentIdentifierReferences) {
            checkReferenceReassignment(currentIdentifierReferences, forLoopScope);
          }
        });
      }
    }

    return {
      "FunctionDeclaration, FunctionExpression": checkDeclaredVariables,
      "ArrowFunctionExpression, CatchClause": checkDeclaredVariables,
      ForInStatement: (node: estree.Node) =>
        checkDeclaredVariablesOfForStatement(node as estree.ForInStatement),
      ForOfStatement: (node: estree.Node) =>
        checkDeclaredVariablesOfForStatement(node as estree.ForOfStatement),
    };
  },
};

function isVariableInsideScope(scopeOfVariable: Scope.Scope, currentScope: Scope.Scope): boolean {
  return (
    scopeOfVariable === currentScope ||
    currentScope.childScopes.some(childScope => isVariableInsideScope(scopeOfVariable, childScope))
  );
}

function getPreciseLocation(identifierLoc: SourceLocation, reference: Scope.Reference) {
  if (!!reference.writeExpr && !!reference.writeExpr.loc) {
    return { start: identifierLoc.start, end: reference.writeExpr.loc.end };
  }
  return identifierLoc;
}
