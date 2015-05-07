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
import org.sonar.javascript.ast.resolve.Usage;
import org.sonar.javascript.ast.visitors.BaseTreeVisitor;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.ScriptTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import java.util.Collection;

@Rule(
  key = "UnusedVariable",
  name = "Unused local variables should be removed",
  priority = Priority.MAJOR,
  tags = {Tags.UNUSED})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.UNDERSTANDABILITY)
@SqaleConstantRemediation("5min")
public class UnusedVariableCheck extends BaseTreeVisitor {

  @Override
  public void visitScript(ScriptTree tree) {
    SymbolModel symbolModel = getContext().getSymbolModel();

    for (Symbol variable : symbolModel.getSymbols(Symbol.Kind.VARIABLE)) {

      Collection<Usage> usages = variable.usages();
      if (noUsages(usages) && !isGlobalOrCatchVariable(variable) && !variable.builtIn()) {
        getContext().addIssue(this, variable.declaration().tree(), "Remove the declaration of the unused '" + variable.name() + "' variable.");
      }
    }
  }

  private boolean noUsages(Collection<Usage> usages) {
    return usages.isEmpty() || usagesAreInitializations(usages);
  }

  private boolean usagesAreInitializations(Collection<Usage> usages) {
    for (Usage usage : usages) {
      if (!usage.isInitialization()) {
        return false;
      }
    }
    return true;
  }

  private boolean isGlobalOrCatchVariable(Symbol symbol) {
    return symbol.scope().tree().is(Kind.SCRIPT, Kind.CATCH_BLOCK);
  }

}
