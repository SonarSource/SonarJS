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

import com.google.common.collect.ImmutableList;
import java.util.ArrayList;
import java.util.List;
import org.sonar.javascript.tree.impl.SeparatedList;
import org.sonar.javascript.tree.symbols.type.FunctionType;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ArrayLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.NewExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ParenthesisedExpressionTree;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

public abstract class AbstractFunctionSizeCheck extends SubscriptionVisitorCheck {

  private boolean immediatelyInvokedFunctionExpression = false;
  private boolean amdPattern = false;
  private List<Tree> angularExclusions;

  abstract void checkFunction(Tree functionTree);

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.of(
      Kind.METHOD,
      Kind.GENERATOR_METHOD,
      Kind.GENERATOR_DECLARATION,
      Kind.GENERATOR_FUNCTION_EXPRESSION,
      Kind.FUNCTION_DECLARATION,
      Kind.FUNCTION_EXPRESSION,

      Kind.CALL_EXPRESSION,
      Kind.NEW_EXPRESSION);
  }

  @Override
  public void visitFile(Tree scriptTree) {
    angularExclusions = new ArrayList<>();
  }

  @Override
  public void visitNode(Tree tree) {
    if (tree.is(Kind.CALL_EXPRESSION)) {
      CallExpressionTree callExpressionTree = (CallExpressionTree) tree;
      checkForImmediatelyInvokedFunction(callExpressionTree.callee());
      checkForAMDPattern(callExpressionTree);
      checkAngularModuleMethodCall(callExpressionTree);
      return;
    }

    if (tree.is(Kind.NEW_EXPRESSION)) {
      if (((NewExpressionTree) tree).arguments() != null) {
        checkForImmediatelyInvokedFunction(((NewExpressionTree) tree).expression());
      }
      return;
    }

    if (!immediatelyInvokedFunctionExpression && !amdPattern && !angularExclusions.contains(tree)) {
      checkFunction(tree);
    }

    clearCheckState();
  }

  private void checkForAMDPattern(CallExpressionTree tree) {
    if (tree.callee().is(Kind.IDENTIFIER_REFERENCE) && "define".equals(((IdentifierTree) tree.callee()).name())) {
      for (Tree parameter : tree.arguments().parameters()) {
        if (parameter.is(Kind.FUNCTION_EXPRESSION)) {
          amdPattern = true;
        }
      }
    }
  }

  private void checkForImmediatelyInvokedFunction(ExpressionTree callee) {
    Kind[] funcExprKinds = {Kind.FUNCTION_EXPRESSION, Kind.GENERATOR_FUNCTION_EXPRESSION};
    boolean directFunctionCallee = callee.is(funcExprKinds);
    boolean parenthesisedFunctionCallee = callee.is(Kind.PARENTHESISED_EXPRESSION) && ((ParenthesisedExpressionTree) callee).expression().is(funcExprKinds);
    if (directFunctionCallee || parenthesisedFunctionCallee) {
      immediatelyInvokedFunctionExpression = true;
    }
  }

  private void checkAngularModuleMethodCall(CallExpressionTree tree) {
    if (tree.callee().is(Kind.DOT_MEMBER_EXPRESSION)) {
      DotMemberExpressionTree callee = (DotMemberExpressionTree) tree.callee();

      if (callee.object().types().contains(Type.Kind.ANGULAR_MODULE)) {
        SeparatedList<Tree> parameters = tree.arguments().parameters();

        if (!parameters.isEmpty()) {
          Tree lastArgument = parameters.get(parameters.size() - 1);

          checkArrayLiteral(lastArgument);
          checkSimpleArgument(lastArgument);
        }
      }
    }
  }

  private void checkArrayLiteral(Tree secondParameter) {
    if (secondParameter.is(Kind.ARRAY_LITERAL)) {
      List<ExpressionTree> elements = ((ArrayLiteralTree) secondParameter).elements();
      checkSimpleArgument(elements.get(elements.size() - 1));
    }
  }

  private void checkSimpleArgument(Tree argument) {
    if (argument instanceof ExpressionTree) {
      Type functionType = ((ExpressionTree) argument).types().getUniqueType(Type.Kind.FUNCTION);
      if (functionType != null) {
        angularExclusions.add(((FunctionType) functionType).functionTree());
      }
    }
  }

  private void clearCheckState() {
    immediatelyInvokedFunctionExpression = false;
    amdPattern = false;
  }

}
