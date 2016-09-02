/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.tree.impl.statement.VariableDeclarationTreeImpl;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Symbol.Kind;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.ArrayBindingPatternTree;
import org.sonar.plugins.javascript.api.tree.declaration.ObjectBindingPatternTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "S3353")
public class UnchangedLetVariableCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Make \"%s\" \"const\".";

  private Set<Symbol> ignoredSymbols;

  @Override
  public void visitScript(ScriptTree tree) {
    ignoredSymbols = new HashSet<>();

    super.visitScript(tree);

    for (Symbol letVariableSymbol : getContext().getSymbolModel().getSymbols(Kind.LET_VARIABLE)) {
      if (!ignoredSymbols.contains(letVariableSymbol)) {
        boolean isWritten = false;
        Usage declarationWithInit = null;

        for (Usage usage : letVariableSymbol.usages()) {
          if (usage.kind() == Usage.Kind.DECLARATION_WRITE) {
            declarationWithInit = usage;

          } else if (usage.isWrite()) {
            isWritten = true;
          }
        }

        if (declarationWithInit != null && !isWritten && letVariableSymbol.usages().size() > 1) {
          addIssue(declarationWithInit.identifierTree(), String.format(MESSAGE, letVariableSymbol.name()));
        }
      }
    }
  }

  @Override
  public void visitForStatement(ForStatementTree tree) {
    Tree init = tree.init();

    if (init != null && init.is(Tree.Kind.LET_DECLARATION)) {
      List<IdentifierTree> identifiers = ((VariableDeclarationTreeImpl) init).variableIdentifiers();
      ignore(identifiers);
    }

    super.visitForStatement(tree);
  }

  @Override
  public void visitArrayBindingPattern(ArrayBindingPatternTree tree) {
    ignore(tree.bindingIdentifiers());
  }

  @Override
  public void visitObjectBindingPattern(ObjectBindingPatternTree tree) {
    ignore(tree.bindingIdentifiers());
  }

  private void ignore(List<IdentifierTree> identifiers) {
    if (identifiers.size() > 1) {
      identifiers.stream()
        .map(identifier -> identifier.symbol())
        .forEach(ignoredSymbols::add);
    }
  }

}
