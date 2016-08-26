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

import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ParameterListTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "ExcessiveParameterList")
public class ExcessiveParameterListCheck extends DoubleDispatchVisitorCheck {

  private static final int DEFAULT_MAXIMUM_FUNCTION_PARAMETERS = 7;

  @RuleProperty(
    key = "maximumFunctionParameters",
    description = "The maximum authorized number of parameters",
    defaultValue = "" + DEFAULT_MAXIMUM_FUNCTION_PARAMETERS)
  private int maximumFunctionParameters = DEFAULT_MAXIMUM_FUNCTION_PARAMETERS;

  @Override
  public void visitMethodDeclaration(MethodDeclarationTree tree) {
    checkNumberOfParameters(tree.parameterClause());
    super.visitMethodDeclaration(tree);
  }

  @Override
  public void visitFunctionDeclaration(FunctionDeclarationTree tree) {
    checkNumberOfParameters(tree.parameterClause());
    super.visitFunctionDeclaration(tree);
  }

  @Override
  public void visitFunctionExpression(FunctionExpressionTree tree) {
    checkNumberOfParameters(tree.parameterClause());
    super.visitFunctionExpression(tree);
  }

  @Override
  public void visitArrowFunction(ArrowFunctionTree tree) {
    Tree parameterClause = tree.parameterClause();
    if (parameterClause.is(Kind.FORMAL_PARAMETER_LIST)) {
      checkNumberOfParameters((ParameterListTree) parameterClause);
    }
    super.visitArrowFunction(tree);
  }

  private void checkNumberOfParameters(ParameterListTree tree) {
    Integer numberOfParameters = tree.parameters().size();

    if (numberOfParameters > maximumFunctionParameters) {
      addIssue(
        tree,
        "Function has " + numberOfParameters + " parameters which is greater than " + maximumFunctionParameters + " authorized.");
    }
  }

  public void setMaximumFunctionParameters(int threshold) {
    this.maximumFunctionParameters = threshold;
  }

}
