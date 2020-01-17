/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import java.util.HashSet;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.javascript.tree.symbols.type.FunctionType;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.SymbolModel;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.ObjectBindingPatternTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@JavaScriptRule
@Rule(key = "UnusedVariable")
public class UnusedVariableCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE_FOR_VARIABLE = "Remove the declaration of the unused '%s' variable.";
  
  private static final String MESSAGE_FOR_FUNCTION = "Remove unused function '%s'.";

  private Set<Symbol> ignoredSymbols;

  @Override
  public void visitObjectBindingPattern(ObjectBindingPatternTree tree) {
    super.visitObjectBindingPattern(tree);

    if (tree.elements().isEmpty()) {
      return;
    }
  
    BindingElementTree lastElement = tree.elements().get(tree.elements().size() - 1);
    if (lastElement.is(Kind.REST_ELEMENT)) {

      for (int i = 0; i < tree.elements().size() - 1; i++) {
        BindingElementTree currentElement = tree.elements().get(i);
        if (currentElement.is(Kind.BINDING_IDENTIFIER)) {
          ignoredSymbols.add(((IdentifierTree) currentElement).symbol().orElse(null));
        }

      }
    }
  }

  @Override
  public void visitScript(ScriptTree tree) {
    ignoredSymbols = new HashSet<>();

    super.visitScript(tree);

    SymbolModel symbolModel = getContext().getSymbolModel();

    for (Symbol symbol : symbolModel.getSymbols()) {
      if (ignoredSymbols.contains(symbol) || isFunctionExpression(symbol)) {
        continue;
      }

      Collection<Usage> usages = symbol.usages();
      if (noUsages(usages) && !isGlobalOrCatchVariable(symbol) && !symbol.external()) {
        if (symbol.isVariable()) {
          raiseIssuesOnDeclarations(symbol, String.format(MESSAGE_FOR_VARIABLE, symbol.name()));
        } else if (symbol.is(Symbol.Kind.FUNCTION)) {
          raiseIssuesOnDeclarations(symbol, String.format(MESSAGE_FOR_FUNCTION, symbol.name()));
        }
      }
    }
  }

  private static boolean isFunctionExpression(Symbol symbol) {
    FunctionType functionType = (FunctionType) symbol.types().getUniqueType(Type.Kind.FUNCTION);
    if (functionType != null && symbol.is(Symbol.Kind.FUNCTION) && functionType.functionTree().is(Kind.FUNCTION_EXPRESSION, Kind.GENERATOR_FUNCTION_EXPRESSION)) {
      return true;
    }

    return false;
  }

  private void raiseIssuesOnDeclarations(Symbol symbol, String message) {
    for (Usage usage : symbol.usages()) {
      if (usage.isDeclaration()) {
        addIssue(usage.identifierTree(), message);
      }
    }
  }

  private static boolean noUsages(Collection<Usage> usages) {
    return usages.isEmpty() || usagesAreInitializations(usages);
  }

  private static boolean usagesAreInitializations(Collection<Usage> usages) {
    for (Usage usage : usages) {
      if (!usage.isDeclaration()) {
        return false;
      }
    }
    return true;
  }

  private static boolean isGlobalOrCatchVariable(Symbol symbol) {
    return symbol.scope().tree().is(Kind.SCRIPT, Kind.CATCH_BLOCK);
  }

}
