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
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
    key = "S2819",
    name = "Cross-document messaging domains should be carefully restricted",
    priority = Priority.CRITICAL,
    tags = {Tags.HTML5, Tags.SECURITY, Tags.OWASP_A3})
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.SECURITY_FEATURES)
@SqaleConstantRemediation("10min")
public class PostMessageCheck extends BaseTreeVisitor {

  private static final String POST_MESSAGE = "postMessage";
  private static final String MESSAGE = "Make sure this cross-domain message is being sent to the intended domain.";

  @Override
  public void visitCallExpression(CallExpressionTree tree) {
    if (tree.callee().is(Tree.Kind.DOT_MEMBER_EXPRESSION)){
      DotMemberExpressionTree callee = (DotMemberExpressionTree) tree.callee();
      boolean isWindow = callee.object().types().contains(Type.Kind.WINDOW) || hasWindowLikeName(callee.object());
      if (isWindow && CheckUtils.asString(callee.property()).equals(POST_MESSAGE)){
        getContext().addIssue(this, callee.property(), MESSAGE);
      }
    }

    super.visitCallExpression(tree);
  }

  private static boolean hasWindowLikeName(ExpressionTree tree) {
    String str = CheckUtils.asString(tree);
    return str.contains("window") || str.contains("Window");
  }

}
