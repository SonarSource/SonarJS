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
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import java.util.Iterator;

@Rule(
  key = "S1472",
  name = "Function call arguments should not start on new line",
  priority = Priority.CRITICAL,
  tags = {Tags.PITFALL})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.INSTRUCTION_RELIABILITY)
@SqaleConstantRemediation("5min")
public class FunctionCallArgumentsOnNewLineCheck extends BaseTreeVisitor {

  @Override
  public void visitCallExpression(CallExpressionTree tree) {

    int calleeLastLine = getLastLine(tree.callee());
    int argumentsLine = ((JavaScriptTree)tree.arguments()).getLine();

    if (calleeLastLine != argumentsLine){
      getContext().addIssue(this, tree.arguments(), "Make those call arguments start on line " + calleeLastLine);
    }
    super.visitCallExpression(tree);
  }

  private int getLastLine(Tree tree){
    JavaScriptTree jsTree = (JavaScriptTree)tree;
    if (jsTree.isLeaf()){
      return jsTree.getLine();
    } else {
      return getLastLine(getLastElement(jsTree.childrenIterator()));
    }
  }

  public Tree getLastElement(Iterator<Tree> itr) {
    Tree lastElement = itr.next();
    while(itr.hasNext()) {
      lastElement=itr.next();
    }
    return lastElement;
  }

}
