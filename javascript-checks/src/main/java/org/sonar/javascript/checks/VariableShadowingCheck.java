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
import org.sonar.javascript.ast.resolve.SymbolModel;
import org.sonar.javascript.ast.visitors.BaseTreeVisitor;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.interfaces.declaration.ScriptTree;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import java.util.List;

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
    SymbolModel symbolModel = getContext().getSymbolModel();
    List<Symbol> symbols = symbolModel.getSymbols(Symbol.Kind.VARIABLE, Symbol.Kind.PARAMETER);
    for (Symbol symbol : symbols){
      visitSymbol(symbolModel, symbol);
    }
  }

  private void visitSymbol(SymbolModel symbolModel, Symbol symbol) {
    if ("arguments".equals(symbol.name()) && symbol.buildIn()){
      return;
    }
    Scope scope = symbolModel.getScopeFor(symbol);
    if (scope.outer() != null) {
      Symbol localSymbol = scope.lookupSymbol(symbol.name());
      Symbol outerSymbol = scope.outer().lookupSymbol(symbol.name());
      if (localSymbol != null && outerSymbol != null) {
        String message = String.format(MESSAGE, symbol.name(), ((JavaScriptTree) outerSymbol.getFirstDeclaration().tree()).getLine());
        getContext().addIssue(this, symbol.getFirstDeclaration().tree(), message);
      }
    }
  }

}
