/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * dev@sonar.codehaus.org
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.javascript.checks;

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.ast.resolve.Scope;
import org.sonar.javascript.ast.resolve.Symbol;
import org.sonar.javascript.ast.resolve.Usage;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.plugins.javascript.api.SymbolModel;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import java.util.Collection;

@Rule(
  key = "VariableShadowing",
  name = "Variables should not be shadowed",
  priority = Priority.MAJOR,
  tags = {Tags.PITFALL})
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.UNDERSTANDABILITY)
@SqaleConstantRemediation("10min")
public class VariableShadowingCheck extends BaseTreeVisitor {

  private static final String MESSAGE = "\"%s\" hides or potentially hides a variable declared in an outer scope at line %s.";

  @Override
  public void visitScript(ScriptTree tree) {
    for (Symbol symbol : getSymbols()){
      visitSymbol(symbol);
    }
  }

  private Collection<Symbol> getSymbols() {
    SymbolModel symbolModel = getContext().getSymbolModel();
    Collection<Symbol> symbols = symbolModel.getSymbols(Symbol.Kind.VARIABLE);
    symbols.addAll(symbolModel.getSymbols(Symbol.Kind.PARAMETER));
    return symbols;
  }

  private void visitSymbol(Symbol symbol) {
    if ("arguments".equals(symbol.name()) && symbol.builtIn()){
      return;
    }
    Scope scope = symbol.scope();
    if (scope.outer() != null) {
      Symbol outerSymbol = scope.outer().lookupSymbol(symbol.name());
      if (outerSymbol != null) {
        String message = String.format(MESSAGE, symbol.name(), ((JavaScriptTree) getDeclaration(outerSymbol).symbolTree()).getLine());
        raiseIssuesOnDeclarations(symbol, message);
      }
    }
  }

  private void raiseIssuesOnDeclarations(Symbol symbol, String message){
    for (Usage usage : symbol.usages()){
      if (usage.isDeclaration() || usage.kind() == Usage.Kind.LEXICAL_DECLARATION){
        getContext().addIssue(this, usage.symbolTree(), message);
      }
    }
  }

  private Usage getDeclaration(Symbol symbol){
    for (Usage usage : symbol.usages()){
      if (usage.isDeclaration() || usage.kind() == Usage.Kind.LEXICAL_DECLARATION){
        return usage;
      }
    }
    return symbol.usages().iterator().next();
  }

}
