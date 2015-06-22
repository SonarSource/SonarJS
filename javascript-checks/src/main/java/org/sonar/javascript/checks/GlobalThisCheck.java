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
import org.sonar.javascript.checks.utils.SubscriptionBaseVisitor;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.MemberExpressionTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import java.util.List;

@Rule(
  key = "S2990",
  name = "The global \"this\" object should not be used",
  priority = Priority.CRITICAL,
  tags = {Tags.PITFALL})
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.INSTRUCTION_RELIABILITY)
@SqaleConstantRemediation("5min")
@ActivatedByDefault
public class GlobalThisCheck extends SubscriptionBaseVisitor {

  private int scopeLevel = 0;

  @Override
  public List<Tree.Kind> nodesToVisit() {
    return ImmutableList.of(
        Tree.Kind.FUNCTION_DECLARATION,
        Tree.Kind.FUNCTION_EXPRESSION,
        Tree.Kind.ARROW_FUNCTION,
        Tree.Kind.METHOD,
        Tree.Kind.GENERATOR_FUNCTION_EXPRESSION,
        Tree.Kind.GET_METHOD,
        Tree.Kind.SET_METHOD,
        Tree.Kind.GENERATOR_METHOD,
        Tree.Kind.GENERATOR_DECLARATION,
        Tree.Kind.DOT_MEMBER_EXPRESSION
    );
  }

  @Override
  public void visitNode(Tree tree) {
    if (tree.is(Tree.Kind.DOT_MEMBER_EXPRESSION)) {
      if (((MemberExpressionTree) tree).object().is(Tree.Kind.THIS) && scopeLevel == 0) {
        getContext().addIssue(this, tree, "Remove the use of \"this\".");
      }
      return;
    }

    scopeLevel++;
  }

  @Override
  public void leaveNode(Tree tree) {
    if (!tree.is(Tree.Kind.DOT_MEMBER_EXPRESSION)){
      scopeLevel--;
    }
  }
}
