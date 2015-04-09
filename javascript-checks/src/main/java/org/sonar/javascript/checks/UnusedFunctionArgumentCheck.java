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
import org.sonar.javascript.model.interfaces.declaration.ScriptTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import java.util.Collection;
import java.util.LinkedList;
import java.util.List;

@Rule(
  key = "UnusedFunctionArgument",
  name = "Unused function parameters should be removed",
  priority = Priority.MAJOR,
  tags = {Tags.MISRA, Tags.UNUSED})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.UNDERSTANDABILITY)
@SqaleConstantRemediation("5min")
public class UnusedFunctionArgumentCheck extends BaseTreeVisitor {
  private static final String MESSAGE = "Remove the unused function parameter%s \"%s\".";

  @Override
  public void visitScript(ScriptTree tree) {
    SymbolModel symbolModel = getContext().getSymbolModel();

    Collection<Scope> scopes = symbolModel.getScopes();
    for (Scope scope : scopes){
      List<Symbol> arguments = scope.getSymbols(Symbol.Kind.PARAMETER);
      List<Symbol> unusedArguments = getUnused(symbolModel, arguments);
      if (!unusedArguments.isEmpty()) {
        String ending = unusedArguments.size() == 1 ? "" : "s";
        getContext().addIssue(this, unusedArguments.get(0).getFirstDeclaration(), String.format(MESSAGE, ending, getListOfArguments(unusedArguments)));
      }
    }
  }

  private String getListOfArguments(List<Symbol> unusedArguments) {
    StringBuilder result = new StringBuilder();
    for (Symbol symbol : unusedArguments){
      result.append(symbol.name());
      result.append(", ");
    }
    return result.toString().replaceFirst(", $", "");
  }

  private List<Symbol> getUnused(SymbolModel symbolModel, List<Symbol> symbols) {
    List<Symbol> result = new LinkedList<>();
    for (Symbol symbol : symbols){
      if (symbolModel.getUsageFor(symbol).isEmpty()){
        result.add(symbol);
      }
    }
    return result;
  }
}
