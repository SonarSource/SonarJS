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

import com.google.common.collect.ImmutableList;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.checks.utils.SubscriptionBaseVisitor;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.expression.CallExpressionTree;
import org.sonar.javascript.model.interfaces.expression.ParenthesisedExpressionTree;
import org.sonar.javascript.model.interfaces.statement.BlockTree;
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

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.of(
        Kind.METHOD,
        Kind.GENERATOR_METHOD,
        Kind.GENERATOR_DECLARATION,
        Kind.GENERATOR_FUNCTION_EXPRESSION,
        Kind.FUNCTION_DECLARATION,
        Kind.FUNCTION_EXPRESSION,
        Kind.CALL_EXPRESSION);
  }

  @Override
  public void visitNode(Tree tree) {
    if (tree.is(Kind.CALL_EXPRESSION)){
      checkForImmediatelyInvokedFunction((CallExpressionTree) tree);
      return;
    }

    int nbLines = getNumberOfLine(tree);
    if (nbLines > max && !immediatelyInvokedFunctionExpression) {
      String message = String.format("This function has %s lines, which is greater than the %s lines authorized. Split it into smaller functions.",nbLines, max);
      getContext().addIssue(this, tree, message);
    }
    this.immediatelyInvokedFunctionExpression = false;
  }

  private void checkForImmediatelyInvokedFunction(CallExpressionTree callExpressionTree) {
    Kind[] funcExprKinds = {Kind.FUNCTION_EXPRESSION, Kind.GENERATOR_FUNCTION_EXPRESSION};
    boolean directFunctionCallee = callExpressionTree.callee().is(funcExprKinds);
    boolean parenthesisedFunctionCallee = callExpressionTree.callee().is(Kind.PARENTHESISED_EXPRESSION) && ((ParenthesisedExpressionTree) callExpressionTree.callee()).expression().is(funcExprKinds);
    if (directFunctionCallee || parenthesisedFunctionCallee){
      this.immediatelyInvokedFunctionExpression = true;
    }
  }

  public static int getNumberOfLine(Tree tree) {
    Iterator<Tree> childrenIterator = ((JavaScriptTree) tree).childrenIterator();
    while (childrenIterator.hasNext()){
      Tree child = childrenIterator.next();
      if (child != null && child.is(Kind.BLOCK)){
        int firstLine = ((InternalSyntaxToken)((BlockTree) child).openCurlyBrace()).getLine();
        int lastLine = ((InternalSyntaxToken)((BlockTree) child).closeCurlyBrace()).getLine();

        return lastLine - firstLine + 1;
      }
    }
    throw new IllegalStateException("No block child found for current tree.");

  }
}
