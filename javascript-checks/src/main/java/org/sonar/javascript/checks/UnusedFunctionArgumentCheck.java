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
import org.sonar.javascript.model.internal.declaration.ParameterListTreeImpl;
import org.sonar.javascript.model.internal.expression.ArrowFunctionTreeImpl;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

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
  public void visitMethodDeclaration(MethodDeclarationTree tree) {
    List<IdentifierTree> parameters = ((ParameterListTreeImpl) tree.parameters()).parameterIdentifiers();
    checkParameters(parameters);
    super.visitMethodDeclaration(tree);
  }

  @Override
  public void visitFunctionDeclaration(FunctionDeclarationTree tree) {
    List<IdentifierTree> parameters = ((ParameterListTreeImpl) tree.parameters()).parameterIdentifiers();
    checkParameters(parameters);
    super.visitFunctionDeclaration(tree);
  }

  @Override
  public void visitArrowFunction(ArrowFunctionTree tree) {
    List<IdentifierTree> parameters = ((ArrowFunctionTreeImpl) tree).parameterIdentifiers();
    checkParameters(parameters);
    super.visitArrowFunction(tree);
  }

  @Override
  public void visitFunctionExpression(FunctionExpressionTree tree) {
    List<IdentifierTree> parameters = ((ParameterListTreeImpl) tree.parameters()).parameterIdentifiers();
    checkParameters(parameters);
    super.visitFunctionExpression(tree);
  }


  private void checkParameters(List<IdentifierTree> parameters) {

  }

  private void visitScope(Scope scope) {
    if (builtInArgumentsUsed(scope) || scope.tree().is(Tree.Kind.SET_METHOD)){
      return;
    }

    List<Symbol> arguments = scope.getSymbols(Symbol.Kind.PARAMETER);
    List<Symbol> unusedArguments = getUnusedArguments(arguments);

    if (!unusedArguments.isEmpty()) {
      String ending = unusedArguments.size() == 1 ? "" : "s";
      getContext().addIssue(this, scope.tree(), String.format(MESSAGE, ending, getListOfArguments(unusedArguments)));
    }
  }

  private List<Symbol> getUnusedArguments(List<Symbol> arguments){
    List<Symbol> unusedArguments = new LinkedList<>();
    List<Boolean> usageInfo = getUsageInfo(arguments);
    boolean usedAfter = false;
    for (int i = arguments.size() - 1; i >= 0; i--){
      if (usageInfo.get(i)){
        usedAfter = true;
      } else if (!usedAfter){
        unusedArguments.add(0, arguments.get(i));
      }
    }
    return unusedArguments;
  }

  private boolean builtInArgumentsUsed(Scope scope) {
    Symbol argumentsBuiltInVariable = scope.lookupSymbol("arguments");
    if (argumentsBuiltInVariable == null){
      return false;
    }
    boolean isUsed = !argumentsBuiltInVariable.usages().isEmpty();
    return argumentsBuiltInVariable.builtIn() && isUsed;
  }

  private List<Boolean> getUsageInfo(List<Symbol> symbols) {
    List<Boolean> result = new LinkedList<>();
    for (Symbol symbol : symbols){
      if (symbol.usages().isEmpty()){
        result.add(false);
      } else {
        result.add(true);
      }
    }
    return result;
  }

  private String getListOfArguments(List<Symbol> unusedArguments) {
    StringBuilder result = new StringBuilder();
    for (Symbol symbol : unusedArguments){
      result.append(symbol.name());
      result.append(", ");
    }
    return result.toString().replaceFirst(", $", "");
  }

}
