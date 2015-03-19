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
import org.sonar.plugins.javascript.api.SymbolModel;
import org.sonar.javascript.ast.resolve.Symbol;
import org.sonar.javascript.ast.resolve.Usage;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedList;
import java.util.List;

@Rule(
    key = "VariableDeclarationAfterUsage",
    name = "Variables should be declared before they are used",
    priority = Priority.MAJOR,
    tags = {Tags.PITFALL})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.LOGIC_RELIABILITY)
@SqaleConstantRemediation("10min")
public class VariableDeclarationAfterUsageCheck extends BaseTreeVisitor {

  private static final String MESSAGE = "Variable '%s' referenced before declaration.";

  @Override
  public void visitScript(ScriptTree tree) {
    SymbolModel symbolModel = getContext().getSymbolModel();
    for (Symbol symbol : symbolModel.getSymbols(Symbol.Kind.VARIABLE)) {
      visitSymbol(symbol);
    }
  }

  private class LineComparator implements Comparator<Usage> {
    @Override
    public int compare(Usage usage1, Usage usage2) {
      return Integer.compare(getLine(usage1), getLine(usage2));
    }
  }

  private void visitSymbol(Symbol symbol) {
    List<Usage> usages = new LinkedList<>(symbol.usages());
    if (!usages.isEmpty()) {
      Collections.sort(usages, new LineComparator());
      int declarationLine = ((JavaScriptTree) symbol.declaration().tree()).getLine();
      Usage firstUsage = usages.get(0);
      int firstUsageLine = getLine(firstUsage);
      if (firstUsageLine < declarationLine) {
        getContext().addIssue(this, firstUsage.symbolTree(), String.format(MESSAGE, symbol.name()));
      }

    }
  }

  private int getLine(Usage usage) {
    return ((JavaScriptTree) usage.symbolTree()).getLine();
  }

}
