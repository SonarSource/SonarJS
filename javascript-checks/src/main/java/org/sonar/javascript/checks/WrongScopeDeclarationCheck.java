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

import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import javax.annotation.CheckForNull;
import org.sonar.api.server.rule.RulesDefinition.SubCharacteristics;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "S1899",
  name = "Variable declarations should be placed appropriately for their scope",
  priority = Priority.MAJOR,
  tags = {Tags.PITFALL})
@ActivatedByDefault
@SqaleSubCharacteristic(SubCharacteristics.UNDERSTANDABILITY)
@SqaleConstantRemediation("10min")
public class WrongScopeDeclarationCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Move the declaration of \"%s\" to line %s.";

  @Override
  public void visitScript(ScriptTree tree) {
    for (Symbol symbol : getContext().getSymbolModel().getSymbols()) {
      if (symbol.isVariable() && !symbol.builtIn()) {
        visitSymbol(symbol);
      }
    }
  }

  private void visitSymbol(Symbol symbol) {
    Usage declaration = getOnlyDeclaration(symbol);
    if (declaration != null && symbol.usages().size() > 1) {
      Scope deepestCommonScope = getDeepestCommonScope(symbol, declaration);

      if (!deepestCommonScope.equals(declaration.identifierTree().scope())) {
        String message = String.format(MESSAGE, symbol.name(), ((JavaScriptTree) deepestCommonScope.tree()).getLine());
        newIssue(declaration.identifierTree(), message);
      }
    }
  }

  /**
   * Returns Usage instance which is the only declaration usage for symbol.
   * Returns null if symbol has no declaration or has several.
   */
  @CheckForNull
  private Usage getOnlyDeclaration(Symbol symbol) {
    Usage declaration = null;
    for (Usage usage : symbol.usages()) {
      if (usage.isDeclaration()) {
        if (declaration == null) {
          declaration = usage;
        } else {
          return null;
        }
      }
    }

    return declaration;
  }

  /**
   * Returns the depth of scope in tree of all scopes (where root is global scope and has 0 depth).
   *
   */
  private int getScopeDepth(Scope scope) {
    int depth = 0;
    Scope currentScope = scope;
    while (!currentScope.isGlobal()) {
      currentScope = currentScope.outer();
      depth++;
    }

    return depth;
  }

  private Scope getDeepestCommonScope(Symbol symbol, Usage declaration) {
    Set<Usage> usages = new HashSet<>(symbol.usages());
    if (!declaration.isWrite()) {
      usages.remove(declaration);
    }

    Map<Scope, Integer> scopeDepthMap = new HashMap<>();
    for (Usage usage : usages) {
      Scope scope = usage.identifierTree().scope();
      scopeDepthMap.put(scope, getScopeDepth(scope));
    }

    int minDepth = Collections.min(scopeDepthMap.values());

    Set<Scope> scopes = new HashSet<>();
    for (Scope scope : scopeDepthMap.keySet()) {
      int depth = scopeDepthMap.get(scope);
      scopes.add(raisedScope(scope, depth - minDepth));
    }

    while (scopes.size() != 1) {
      scopes = allScopesRaiseOneLevel(scopes);
    }

    return (Scope) scopes.toArray()[0];
  }


  private Scope raisedScope(Scope scope, int levelsUp) {
    Scope currentScope = scope;
    for (int i = 0; i < levelsUp; i++) {
      currentScope = currentScope.outer();
    }

    return currentScope;
  }

  private Set<Scope> allScopesRaiseOneLevel(Set<Scope> scopes) {
    Set<Scope> result = new HashSet<>();
    for (Scope scope : scopes) {
      result.add(scope.outer());
    }

    return result;
  }
}
