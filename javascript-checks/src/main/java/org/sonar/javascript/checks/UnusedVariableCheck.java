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

import java.util.Collection;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.SymbolModel;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "UnusedVariable",
  name = "Unused local variables should be removed",
  priority = Priority.MAJOR,
  tags = {Tags.UNUSED})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.UNDERSTANDABILITY)
@SqaleConstantRemediation("5min")
public class UnusedVariableCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Remove the declaration of the unused '%s' variable.";

  @Override
  public void visitScript(ScriptTree tree) {
    SymbolModel symbolModel = getContext().getSymbolModel();

    for (Symbol symbol : symbolModel.getSymbols()) {

      if (symbol.isVariable()) {
        Collection<Usage> usages = symbol.usages();
        if (noUsages(usages) && !isGlobalOrCatchVariable(symbol) && !symbol.builtIn()) {
          raiseIssuesOnDeclarations(symbol, String.format(MESSAGE, symbol.name()));
        }
      }
    }
  }

  private void raiseIssuesOnDeclarations(Symbol symbol, String message) {
    for (Usage usage : symbol.usages()) {
      if (usage.isDeclaration()) {
        addLineIssue(usage.identifierTree(), message);
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
