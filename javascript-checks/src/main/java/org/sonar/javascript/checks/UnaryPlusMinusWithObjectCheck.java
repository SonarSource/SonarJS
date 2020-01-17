/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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

import java.util.EnumSet;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.Type;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

@JavaScriptRule
@Rule(key = "S3002")
public class UnaryPlusMinusWithObjectCheck extends AbstractAllPathSeCheck<UnaryExpressionTree> {

  private static final String MESSAGE = "Remove this use of unary \"%s\".";

  private static final EnumSet<Type> NOT_ALLOWED_TYPES = EnumSet.of(
    Type.ARRAY,
    Type.FUNCTION,
    Type.OBJECT,
    Type.REGEXP,
    Type.DATE
  );

  @Override
  UnaryExpressionTree getTree(Tree element) {
    if (element.is(Kind.UNARY_MINUS, Kind.UNARY_PLUS)) {
      return (UnaryExpressionTree) element;
    }
    return null;
  }

  @Override
  boolean isProblem(UnaryExpressionTree tree, ProgramState currentState) {

    Constraint constraint = currentState.getConstraint(currentState.peekStack());
    Type type = constraint.type();
    boolean isDateCasting = type == Type.DATE && tree.is(Kind.UNARY_PLUS);
    return !isDateCasting && type != null && NOT_ALLOWED_TYPES.contains(type);
  }

  @Override
  void raiseIssue(UnaryExpressionTree tree) {
    if (!isDateException(tree)) {
      SyntaxToken operator = tree.operatorToken();
      addIssue(operator, String.format(MESSAGE, operator.text()));
    }
  }

  private static boolean isDateException(Tree tree) {
    if (tree.is(Kind.UNARY_PLUS)) {
      String exprString = CheckUtils.asString(((UnaryExpressionTree) tree).expression());
      return exprString.contains("Date") || exprString.contains("date");
    }
    return false;
  }

}
