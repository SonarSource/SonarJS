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

import java.util.List;

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.SubscriptionBaseVisitor;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.expression.CallExpressionTree;
import org.sonar.javascript.model.interfaces.expression.DotMemberExpressionTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import com.google.common.collect.ImmutableList;

@Rule(
  key = "S2228",
  name = "Console logging should not be used",
  priority = Priority.MAJOR,
  tags = {Tags.OWASP_A6, Tags.SECURITY})
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.SECURITY_FEATURES)
@SqaleConstantRemediation("5min")
public class ConsoleLoggingCheck extends SubscriptionBaseVisitor {

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.of(Kind.CALL_EXPRESSION);
  }

  @Override
  public void visitNode(Tree tree) {
    CallExpressionTree callExpression = (CallExpressionTree) tree;

    if (callExpression.callee().is(Kind.DOT_MEMBER_EXPRESSION)) {
      DotMemberExpressionTree callee = (DotMemberExpressionTree) callExpression.callee();

      if (isCalleeConsoleLogging(callee)) {
        addIssue(tree, "Remove this logging statement.");
      }
    }

  }

  private boolean isCalleeConsoleLogging(DotMemberExpressionTree callee) {
    return callee.object().is(Kind.IDENTIFIER_REFERENCE) && "console".equals(((IdentifierTree) callee.object()).name())
      && "log".equals(((IdentifierTree) callee.property()).name());
  }

}
