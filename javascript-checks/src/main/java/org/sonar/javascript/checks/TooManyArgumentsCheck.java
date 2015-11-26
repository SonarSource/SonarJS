/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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

import java.util.Set;
import javax.annotation.Nullable;
import java.util.Collections;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.tree.impl.SeparatedList;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.javascript.tree.symbols.type.FunctionType;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
    key = "S930",
    name = "Function calls should not pass extra arguments",
    priority = Priority.CRITICAL,
    tags = {Tags.BUG, Tags.CWE, Tags.MISRA})
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.DATA_RELIABILITY)
@SqaleConstantRemediation("10min")
@ActivatedByDefault
public class TooManyArgumentsCheck extends BaseTreeVisitor {

  private static final String MESSAGE = "%s expects \"%s\" arguments, but \"%s\" were provided.";

  @Override
  public void visitCallExpression(CallExpressionTree tree) {
    FunctionTree functionTree = getFunction(tree);

    if (functionTree != null) {

      int parametersNumber = functionTree.parameters().parameters().size();
      int argumentsNumber = tree.arguments().parameters().size();

      if (!hasRestParameter(functionTree) && !builtInArgumentsUsed(functionTree) && argumentsNumber > parametersNumber) {
        String message = getMessage(tree, parametersNumber, argumentsNumber);
        IssueLocation secondaryLocation = new IssueLocation(functionTree.parameters(), "Formal parameters");
        getContext().addIssue(this, new IssueLocation(tree.arguments(), message), Collections.singletonList(secondaryLocation), null);
      }

    }

    super.visitCallExpression(tree);
  }

  private static String getMessage(CallExpressionTree tree, int parametersNumber, int argumentsNumber) {
    String callee;
    if (CheckUtils.removeParenthesis(tree.callee()).is(Kind.FUNCTION_EXPRESSION)){
      callee = "This function";
    } else {
      callee = "\"" + CheckUtils.asString(tree.callee()) + "\"";
    }
    return String.format(MESSAGE, callee, parametersNumber, argumentsNumber);
  }

  /*
   * @return true if function's last parameter has "... p" format and stands for all rest parameters
   */
  private static boolean hasRestParameter(FunctionTree functionTree) {
    SeparatedList<Tree> parameters = functionTree.parameters().parameters();
    return !parameters.isEmpty() && (parameters.get(parameters.size() - 1).is(Tree.Kind.REST_ELEMENT));
  }


  @Nullable
  private static FunctionTree getFunction(CallExpressionTree tree) {
    Set<Type> types = tree.callee().types();

    if (types.size() == 1 && types.iterator().next().kind().equals(Type.Kind.FUNCTION)) {
      return ((FunctionType) types.iterator().next()).functionTree();
    }

    return null;
  }


  private boolean builtInArgumentsUsed(FunctionTree tree) {
    Scope scope = getContext().getSymbolModel().getScope(tree);
    if (scope == null) {
      throw new IllegalStateException("No scope found for FunctionTree");
    }

    Symbol argumentsBuiltInVariable = scope.lookupSymbol("arguments");
    if (argumentsBuiltInVariable == null) {
      throw new IllegalStateException("No 'arguments' symbol found for function scope");
    }

    boolean isUsed = !argumentsBuiltInVariable.usages().isEmpty();
    return argumentsBuiltInVariable.builtIn() && isUsed;
  }

}
