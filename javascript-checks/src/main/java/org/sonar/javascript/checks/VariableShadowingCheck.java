/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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
package org.sonar.javascript.checks;

import org.sonar.check.Rule;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Symbol.Kind;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "VariableShadowing")
public class VariableShadowingCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "\"%s\" hides or potentially hides a variable declared in an outer scope at line %s.";

  @Override
  public void visitScript(ScriptTree tree) {
    for (Symbol symbol : getContext().getSymbolModel().getSymbols()) {
      if (symbol.isVariable() || symbol.is(Kind.PARAMETER)) {
        visitSymbol(symbol);
      }
    }
  }

  private void visitSymbol(Symbol symbol) {
    if ("arguments".equals(symbol.name()) && symbol.external()) {
      return;
    }
    Scope scope = symbol.scope();
    if (scope.outer() != null) {
      Symbol outerSymbol = scope.outer().lookupSymbol(symbol.name());
      if (outerSymbol != null && !outerSymbol.external()) {
        IdentifierTree shadowedDeclaration = getDeclaration(outerSymbol).identifierTree();
        String message = String.format(MESSAGE, symbol.name(), shadowedDeclaration.identifierToken().line());
        raiseIssuesOnDeclarations(symbol, message, shadowedDeclaration);
      }
    }
  }

  private void raiseIssuesOnDeclarations(Symbol symbol, String message, IdentifierTree shadowedDeclaration) {
    for (Usage usage : symbol.usages()) {
      if (usage.isDeclaration()) {
        addIssue(usage.identifierTree(), message).secondary(shadowedDeclaration);
      }
    }
  }

  private static Usage getDeclaration(Symbol symbol) {
    for (Usage usage : symbol.usages()) {
      if (usage.isDeclaration()) {
        return usage;
      }
    }
    return symbol.usages().iterator().next();
  }

}
