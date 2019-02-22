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
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import javax.annotation.CheckForNull;
import org.sonar.check.Rule;
import org.sonar.javascript.cfg.CfgBlock;
import org.sonar.javascript.cfg.ControlFlowGraph;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.se.LiveVariableAnalysis;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "S2392")
public class WrongScopeDeclarationCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Move the declaration of \"%s\" to line %s.";

  @Override
  public void visitScript(ScriptTree tree) {
    for (Symbol symbol : getContext().getSymbolModel().getSymbols()) {
      if (symbol.isVariable() && !symbol.external()) {
        visitSymbol(symbol);
      }
    }
  }

  private void visitSymbol(Symbol symbol) {
    Usage declaration = getOnlyDeclaration(symbol);

    if (declaration != null && symbol.usages().size() > 1) {

      Scope deepestCommonScope = getDeepestCommonScope(symbol, declaration);
      Scope declarationScope = declaration.identifierTree().scope();

      if (!deepestCommonScope.equals(declarationScope)
        && !isFunctionException(deepestCommonScope, declarationScope)
        && deadVariableInScope(symbol, deepestCommonScope, declarationScope, declaration.identifierTree())) {

        String message = String.format(MESSAGE, symbol.name(), deepestCommonScope.tree().firstToken().line() + 1);
        addIssue(declaration.identifierTree(), message);
      }
    }

  }

  private boolean deadVariableInScope(Symbol symbol, Scope scopeToCheck, Scope upperScope, Tree declaration) {
    ControlFlowGraph cfg = CheckUtils.buildControlFlowGraph(declaration);
    IdentifierTree firstIdentifierOfScope = getFirstIdentifier(scopeToCheck.tree());
    CfgBlock firstCfgBlockOfScope = null;

    for (CfgBlock cfgBlock : cfg.blocks()) {
      if (cfgBlock.elements().contains(firstIdentifierOfScope)) {
        firstCfgBlockOfScope = cfgBlock;
      }
    }

    // might be null for scopeToCheck being nested inside the function
    if (firstCfgBlockOfScope == null) {
      return false;
    }

    LiveVariableAnalysis lva = LiveVariableAnalysis.create(cfg, upperScope);
    return !lva.getLiveInSymbols(firstCfgBlockOfScope).contains(symbol);
  }

  private static IdentifierTree getFirstIdentifier(Tree tree) {
    IdentifierVisitor identifierVisitor = new IdentifierVisitor();
    tree.accept(identifierVisitor);
    Preconditions.checkNotNull(identifierVisitor.identifier, "Deepest common scope should contain at least one identifier");
    return identifierVisitor.identifier;
  }

  private static class IdentifierVisitor extends DoubleDispatchVisitor {

    IdentifierTree identifier;

    @Override
    public void visitIdentifier(IdentifierTree tree) {
      if (tree.is(Kind.IDENTIFIER_REFERENCE)) {
        identifier = tree;
      }
    }

    @Override
    protected void scanChildren(Tree tree) {
      if (identifier == null) {
        super.scanChildren(tree);
      }
    }
  }

  /**
   * True for variable which deepest common scope (correct declaration scope) is function which is nested into declaration scope
   * E.g.
   * <pre>
   *  var y;   // should be OK
   *  function foo(p) {
   *    if (y) {
   *      bar(y);
   *    }
   *    y = p;
   *  }
   *
   *  for (var j = 1; j < 10; j++) {
   *    foo(j)
   *  }
   * </pre>
   *
   */
  private static boolean isFunctionException(Scope deepestCommonScope, Scope declarationScope) {
    return !deepestCommonScope.isBlock() && getScopeDepth(deepestCommonScope) > getScopeDepth(declarationScope);
  }

  /**
   * Returns Usage instance which is the only declaration usage for symbol.
   * Returns null if symbol has no declaration or has several.
   */
  @CheckForNull
  private static Usage getOnlyDeclaration(Symbol symbol) {
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
   */
  private static int getScopeDepth(Scope scope) {
    int depth = 0;
    Scope currentScope = scope;
    while (!currentScope.isGlobal()) {
      currentScope = currentScope.outer();
      depth++;
    }

    return depth;
  }

  private static Scope getDeepestCommonScope(Symbol symbol, Usage declaration) {
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

    Set<Scope> sameDepthScopes = new HashSet<>();
    for (Entry<Scope, Integer> entry : scopeDepthMap.entrySet()) {
      sameDepthScopes.add(getAncestorScope(entry.getKey(), entry.getValue() - minDepth));
    }

    while (sameDepthScopes.size() != 1) {
      sameDepthScopes = outerScopes(sameDepthScopes);
    }

    return sameDepthScopes.iterator().next();
  }

  private static Scope getAncestorScope(Scope scope, int levelsUp) {
    Scope currentScope = scope;
    for (int i = 0; i < levelsUp; i++) {
      currentScope = currentScope.outer();
    }

    return currentScope;
  }

  private static Set<Scope> outerScopes(Set<Scope> scopes) {
    Set<Scope> result = new HashSet<>();
    for (Scope scope : scopes) {
      result.add(scope.outer());
    }

    return result;
  }
}
