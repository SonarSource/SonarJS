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

import java.util.Collection;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.SymbolModel;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "S2814")
public class RedeclaredSymbolCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Rename \"%s\" as this name is already used in declaration at line %s.";

  @Override
  public void visitScript(ScriptTree tree) {
    SymbolModel symbolModel = getContext().getSymbolModel();
    Collection<Symbol> symbols = symbolModel.getSymbols();
    for (Symbol symbol : symbols) {
      visitSymbol(symbol);
    }
  }

  private void visitSymbol(Symbol symbol) {
    Usage firstDeclaration = null;

    for (Usage usage : symbol.usages()) {

      if (firstDeclaration == null) {
        if (usage.isDeclaration()) {
          firstDeclaration = usage;
        }
      } else if (usage.isDeclaration() && usage.kind() != Usage.Kind.LEXICAL_DECLARATION) {
        String message = String.format(MESSAGE, symbol.name(), firstDeclaration.identifierTree().identifierToken().line());
        addIssue(usage.identifierTree(), message).secondary(firstDeclaration.identifierTree());
      }
    }
  }

}
