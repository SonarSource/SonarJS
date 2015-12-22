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

import java.util.LinkedList;
import java.util.List;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.SymbolModel;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

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
    for (Symbol symbol : symbolModel.getSymbols()) {
      visitSymbol(symbol);
    }
  }

  private void visitSymbol(Symbol symbol) {
    Scope scope = symbol.scope();
    if (scope.isGlobal()) {
      return;
    }
    List<Usage> usages = new LinkedList<>(symbol.usages());
    if (!hasRead(usages)) {
      for (Usage usage : usages) {
        if (!usage.isDeclaration() && usage.kind() != Usage.Kind.LEXICAL_DECLARATION) {
          getContext().addIssue(this, usage.identifierTree(), String.format(MESSAGE, symbol.name()));
        }
      }
    }

  }

  private static boolean hasRead(List<Usage> usages) {
    for (Usage usage : usages) {
      if (usage.kind().equals(Usage.Kind.READ) || usage.kind().equals(Usage.Kind.READ_WRITE)) {
        return true;
      }
    }
    return false;
  }

}
