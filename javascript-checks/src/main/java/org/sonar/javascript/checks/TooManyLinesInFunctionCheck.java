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

import com.google.common.collect.ImmutableList;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.checks.utils.SubscriptionBaseVisitor;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.NewExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ParenthesisedExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import java.util.Iterator;
import java.util.List;

@Rule(
  key = "S138",
  name = "Functions should not have too many lines",
  priority = Priority.MAJOR,
  tags = {Tags.BRAIN_OVERLOAD})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.UNDERSTANDABILITY)
@SqaleConstantRemediation("20min")
public class TooManyLinesInFunctionCheck extends SubscriptionBaseVisitor {
  private static final int DEFAULT = 100;

  @RuleProperty(
    key = "max",
    description = "Maximum authorized lines in a function",
    defaultValue = "" + DEFAULT)
  public int max = DEFAULT;
  private boolean immediatelyInvokedFunctionExpression = false;
  private boolean amdPattern = false;

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
  public void visitNode(Tree tree) {
    if (tree.is(Kind.CALL_EXPRESSION)) {
      checkForImmediatelyInvokedFunction(((CallExpressionTree) tree).callee());
      checkForAMDPattern((CallExpressionTree) tree);
      return;
    }

    if (tree.is(Kind.NEW_EXPRESSION)) {
      if (((NewExpressionTree)tree).arguments() != null) {
        checkForImmediatelyInvokedFunction(((NewExpressionTree) tree).expression());
      }
      return;
    }

    int nbLines = getNumberOfLine(tree);
    if (nbLines > max && !immediatelyInvokedFunctionExpression && !amdPattern) {
      String message = String.format("This function has %s lines, which is greater than the %s lines authorized. Split it into smaller functions.", nbLines, max);
      getContext().addIssue(this, tree, message);
    }
    clearCheckState();
  }

  private void clearCheckState() {
    this.immediatelyInvokedFunctionExpression = false;
    this.amdPattern = false;
  }

  private void checkForAMDPattern(CallExpressionTree tree) {
    if (tree.callee().is(Kind.IDENTIFIER_REFERENCE) && "define".equals(((IdentifierTree) tree.callee()).name())){
      for (Tree parameter : tree.arguments().parameters()){
        if (parameter.is(Kind.FUNCTION_EXPRESSION)){
          this.amdPattern = true;
        }
      }
    }
  }

  private void checkForImmediatelyInvokedFunction(ExpressionTree callee) {
    Kind[] funcExprKinds = {Kind.FUNCTION_EXPRESSION, Kind.GENERATOR_FUNCTION_EXPRESSION};
    boolean directFunctionCallee = callee.is(funcExprKinds);
    boolean parenthesisedFunctionCallee = callee.is(Kind.PARENTHESISED_EXPRESSION) && ((ParenthesisedExpressionTree) callee).expression().is(funcExprKinds);
    if (directFunctionCallee || parenthesisedFunctionCallee){
      this.immediatelyInvokedFunctionExpression = true;
    }
  }

  public static int getNumberOfLine(Tree tree) {
    Iterator<Tree> childrenIterator = ((JavaScriptTree) tree).childrenIterator();
    while (childrenIterator.hasNext()){
      Tree child = childrenIterator.next();
      if (child != null && child.is(Kind.BLOCK)){
        int firstLine = ((BlockTree) child).openCurlyBrace().line();
        int lastLine = ((BlockTree) child).closeCurlyBrace().line();

        return lastLine - firstLine + 1;
      }
    }
    throw new IllegalStateException("No block child found for current tree.");

  }
}
