/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
 * mailto:info AT sonarsource DOT com
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

import com.google.common.collect.ImmutableSet;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.tree.KindSet;
import org.sonar.plugins.javascript.api.tree.Kinds;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.ExpressionStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@JavaScriptRule
@Rule(key = "S905")
public class UselessExpressionStatementCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Refactor or remove this statement.";

  private static final Set<String> KNOWN_DIRECTIVES = ImmutableSet.of("use strict", "$:nomunge", "ngInject");

  private static final Kinds[] KINDS_WITH_SIDE_EFFECTS = {
    KindSet.ASSIGNMENT_KINDS,
    Kind.CONDITIONAL_AND,
    Kind.CONDITIONAL_OR,
    Kind.CONDITIONAL_EXPRESSION,
    Kind.CALL_EXPRESSION,
    Kind.NEW_EXPRESSION,
    KindSet.INC_DEC_KINDS,
    Kind.YIELD_EXPRESSION,
    Kind.DELETE,
    Kind.COMMA_OPERATOR,
    Kind.BRACKET_MEMBER_EXPRESSION,
    Kind.DOT_MEMBER_EXPRESSION,
    Kind.VOID,
    Kind.AWAIT,
    Kind.TAGGED_TEMPLATE
  };

  @Override
  public void visitExpressionStatement(ExpressionStatementTree tree) {
    ExpressionTree expression = CheckUtils.removeParenthesis(tree.expression());

    if (expression.is(Kind.STRING_LITERAL)) {
      if (!isDirective((LiteralTree) expression)) {
        addIssue(tree, MESSAGE);
      }

    } else if (!expression.is(KINDS_WITH_SIDE_EFFECTS) && !isIIFE(expression) && !insideTry(tree)) {
      addIssue(tree, MESSAGE);
    }

    super.visitExpressionStatement(tree);
  }

  private static boolean insideTry(ExpressionStatementTree tree) {
    return tree.parent().parent().is(Kind.TRY_STATEMENT);
  }

  private static boolean isIIFE(ExpressionTree expression) {
    if (expression.is(Kind.CALL_EXPRESSION)) {
      CallExpressionTree callExpressionTree = (CallExpressionTree) expression;
      ExpressionTree callee = CheckUtils.removeParenthesis(callExpressionTree.callee());
      return callee.is(Kind.FUNCTION_EXPRESSION, Kind.ARROW_FUNCTION);

    } else if (expression.is(Kind.LOGICAL_COMPLEMENT)) {
      ExpressionTree operand = ((UnaryExpressionTree) expression).expression();
      return isIIFE(CheckUtils.removeParenthesis(operand));
    }

    return false;
  }

  private static boolean isDirective(LiteralTree tree) {
    if (tree.is(Kind.STRING_LITERAL)) {
      return KNOWN_DIRECTIVES.contains(trimQuotes((tree).value()));
    }

    return false;
  }

  private static String trimQuotes(String value) {
    return value.substring(1, value.length() - 1);
  }
}
