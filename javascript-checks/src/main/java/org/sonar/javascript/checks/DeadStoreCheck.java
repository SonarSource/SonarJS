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
import org.sonar.javascript.ast.resolve.Scope;
import org.sonar.javascript.ast.resolve.Symbol;
import org.sonar.javascript.ast.resolve.Usage;
import org.sonar.javascript.ast.visitors.BaseTreeVisitor;
import org.sonar.javascript.model.interfaces.declaration.ScriptTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import java.util.LinkedList;
import java.util.List;
import java.util.Set;

@Rule(
    key = "S1854",
    name = "Dead Stores should be removed",
    priority = Priority.MAJOR,
    tags = {Tags.BUG, Tags.CERT, Tags.CWE, Tags.UNUSED})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.DATA_RELIABILITY)
@SqaleConstantRemediation("15min")
public class DeadStoreCheck extends BaseTreeVisitor {

  private static final String MESSAGE = "Remove this useless assignment to local variable \"%s\"";

  @Override
  public void visitScript(ScriptTree tree) {
    SymbolModel symbolModel = getContext().getSymbolModel();
    Set<Symbol> symbols = symbolModel.getSymbols();
    for (Symbol symbol : symbols) {
      visitSymbol(symbol, symbolModel);
    }
  }

  private void visitSymbol(Symbol symbol, SymbolModel symbolModel) {
    Scope scope = symbol.scope();
    if (scope.equals(scope.globalScope())) {
      return;
    }
    List<Usage> usages = new LinkedList<>(symbolModel.getUsagesFor(symbol));
    if (!hasRead(usages)) {
      for (Usage usage : usages) {
        if (!usage.isInit()) {
          getContext().addIssue(this, usage.symbolTree(), String.format(MESSAGE, symbol.name()));
        }
      }
    }

  }

  private boolean hasRead(List<Usage> usages) {
    for (Usage usage : usages){
      if (usage.kind().equals(Usage.Kind.READ) || usage.kind().equals(Usage.Kind.READ_WRITE)){
        return true;
      }
    }
    return false;
  }

}
