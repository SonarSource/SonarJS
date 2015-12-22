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

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.statement.ExpressionStatementTree;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "S905",
  name = "Non-empty statements should have at least one side-effect",
  priority = Priority.CRITICAL,
  tags = {Tags.BUG, Tags.CWE, Tags.UNUSED})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.LOGIC_RELIABILITY)
@SqaleConstantRemediation("5min")
public class UselessExpressionStatementCheck extends BaseTreeVisitor {

  private static final String MESSAGE = "Refactor or remove this statement.";

  @Override
  public void visitExpressionStatement(ExpressionStatementTree tree) {
    Tree expression = tree.expression();

    if (expression.is(Kind.EQUAL_TO)) {
      getContext().addIssue(this, tree, MESSAGE);
    }

    if (expression.is(Kind.STRING_LITERAL) && !isUseStrictDirective((LiteralTree) expression)) {
      getContext().addIssue(this, tree, MESSAGE);
    }

    super.visitExpressionStatement(tree);
  }

  private static boolean isUseStrictDirective(LiteralTree tree) {
    if (tree.is(Kind.STRING_LITERAL)) {
      String value = (tree).value();
      value = value.substring(1, value.length() - 1);
      return "use strict".equals(value);
    }

    return false;
  }
}
