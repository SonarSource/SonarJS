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
package org.sonar.javascript.checks;

import com.google.common.base.Preconditions;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.SymbolModel;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@JavaScriptRule
@Rule(key = "UnusedFunctionArgument")
public class UnusedFunctionArgumentCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Remove the unused function parameter \"%s\".";

  private static class PositionComparator implements Comparator<Symbol> {

    private static int getLine(Symbol symbol) {
      return getDeclarationUsage(symbol).identifierTree().identifierToken().line();
    }

    private static int getColumn(Symbol symbol) {
      return getDeclarationUsage(symbol).identifierTree().firstToken().column();
    }

    @Override
    public int compare(Symbol symbol1, Symbol symbol2) {
      int lineCompare = Integer.compare(getLine(symbol1), getLine(symbol2));
      if (lineCompare == 0) {
        return Integer.compare(getColumn(symbol1), getColumn(symbol2));
      } else {
        return lineCompare;
      }
    }

    private static Usage getDeclarationUsage(Symbol symbol) {
      Preconditions.checkArgument(symbol.is(Symbol.Kind.PARAMETER));
      for (Usage usage : symbol.usages()) {
        if (usage.kind() == Usage.Kind.LEXICAL_DECLARATION) {
          return usage;
        }
      }
      // parameter symbol is required to have LEXICAL_DECLARATION usage
      throw new IllegalStateException();
    }
  }

  public Collection<Scope> getScopes() {
    SymbolModel symbolModel = getContext().getSymbolModel();
    Set<Scope> uniqueScopes = new HashSet<>();
    for (Symbol symbol : symbolModel.getSymbols()) {
      uniqueScopes.add(symbol.scope());
    }
    return uniqueScopes;
  }

  @Override
  public void visitScript(ScriptTree tree) {
    Collection<Scope> scopes = getScopes();

    for (Scope scope : scopes) {
      visitScope(scope);
    }
  }

  private void visitScope(Scope scope) {
    if (builtInArgumentsUsed(scope) || scope.tree().is(Tree.Kind.SET_METHOD)) {
      return;
    }

    List<Symbol> arguments = scope.getSymbols(Symbol.Kind.PARAMETER);
    List<Symbol> unusedArguments = getUnusedArguments(arguments);

    for (Symbol unusedArgument : unusedArguments) {
      IdentifierTree parameterIdentifier = PositionComparator.getDeclarationUsage(unusedArgument).identifierTree();
      addIssue(parameterIdentifier, String.format(MESSAGE, parameterIdentifier.name()));
    }
  }

  private static List<Symbol> getUnusedArguments(List<Symbol> arguments) {
    List<Symbol> unusedArguments = new LinkedList<>();
    Collections.sort(arguments, new PositionComparator());
    List<Boolean> usageInfo = getUsageInfo(arguments);
    boolean usedAfter = false;
    for (int i = arguments.size() - 1; i >= 0; i--) {
      if (usageInfo.get(i)) {
        usedAfter = true;
      } else if (!usedAfter) {
        unusedArguments.add(0, arguments.get(i));
      }
    }
    return unusedArguments;
  }

  private static boolean builtInArgumentsUsed(Scope scope) {
    Symbol argumentsBuiltInVariable = scope.lookupSymbol("arguments");
    if (argumentsBuiltInVariable == null) {
      return false;
    }
    boolean isUsed = !argumentsBuiltInVariable.usages().isEmpty();
    return argumentsBuiltInVariable.external() && isUsed;
  }

  private static List<Boolean> getUsageInfo(List<Symbol> symbols) {
    List<Boolean> result = new LinkedList<>();
    for (Symbol symbol : symbols) {
      if (symbol.usages().size() == 1) {
        // only declaration
        result.add(false);
      } else {
        result.add(true);
      }
    }
    return result;
  }

}
