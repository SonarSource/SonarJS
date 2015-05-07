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
import org.sonar.javascript.api.SymbolModel;
import org.sonar.javascript.ast.resolve.Symbol;
import org.sonar.javascript.ast.resolve.SymbolDeclaration;
import org.sonar.javascript.ast.visitors.BaseTreeVisitor;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.declaration.ScriptTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import java.util.Collection;
import java.util.List;

@Rule(
  key = "S2814",
  name = "Variables and functions should not be redeclared",
  priority = Priority.MAJOR,
  tags = {Tags.BUG, Tags.PITFALL})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.LOGIC_RELIABILITY)
@SqaleConstantRemediation("20min")
public class RedeclaredSymbolCheck extends BaseTreeVisitor {

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
    List<SymbolDeclaration> declarations = symbol.declarations();
    SymbolDeclaration firstDeclaration = symbol.declaration();
    int firstDeclarationLine = ((JavaScriptTree)firstDeclaration.tree()).getLine();
    for (int i = 1; i < declarations.size(); i++) {
      if (!(firstDeclaration.is(SymbolDeclaration.Kind.PARAMETER) && declarations.get(i).is(SymbolDeclaration.Kind.PARAMETER))) {
        getContext().addIssue(this, declarations.get(i).tree(), String.format(MESSAGE, symbol.name(), firstDeclarationLine));
      }
    }
  }

}
