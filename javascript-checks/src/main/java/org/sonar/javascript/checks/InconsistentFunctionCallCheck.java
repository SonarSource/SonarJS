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

import com.google.common.collect.LinkedListMultimap;
import com.google.common.collect.ListMultimap;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import javax.annotation.CheckForNull;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.NewExpressionTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;

@Rule(
  key = "S3686",
  name = "Functions should not be called both with and without \"new\"",
  priority = Priority.CRITICAL)
@ActivatedByDefault
@SqaleConstantRemediation("15min")
public class InconsistentFunctionCallCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Correct the use of this function; on line %s it was called with%s \"new\".";
  private static final String SECONDARY_MESSAGE = "Called with%s \"new\"";

  private Set<Symbol> hasIssue = new HashSet<>();

  private ListMultimap<Symbol, CallExpressionTree> usedInCallExpression = LinkedListMultimap.create();
  private ListMultimap<Symbol, NewExpressionTree> usedInNewExpression = LinkedListMultimap.create();

  @Override
  public void visitCallExpression(CallExpressionTree tree) {
    ExpressionTree callee = tree.callee();
    Symbol symbol = getSymbol(callee);
    if (symbol != null) {
      List<NewExpressionTree> newExpressions = usedInNewExpression.get(symbol);
      if (!newExpressions.isEmpty() && !hasIssue.contains(symbol)) {
        NewExpressionTree lastUsage = newExpressions.get(newExpressions.size() - 1);
        String message = String.format(MESSAGE, ((JavaScriptTree) lastUsage).getLine(), "");
        String secondaryMessage = String.format(SECONDARY_MESSAGE, "");

        addIssue(callee, message)
          .secondary(issueLocation(lastUsage, secondaryMessage));

        hasIssue.add(symbol);

      } else {
        usedInCallExpression.put(symbol, tree);
      }
    }

    super.visitCallExpression(tree);
  }

  @Override
  public void visitNewExpression(NewExpressionTree tree) {
    ExpressionTree instantiated = tree.expression();
    Symbol symbol = getSymbol(instantiated);
    if (symbol != null) {
      List<CallExpressionTree> callExpressions = usedInCallExpression.get(symbol);
      if (!callExpressions.isEmpty() && !hasIssue.contains(symbol)) {
        CallExpressionTree lastUsage = callExpressions.get(callExpressions.size() - 1);
        String message = String.format(MESSAGE, ((JavaScriptTree) lastUsage).getLine(), "out");
        String secondaryMessage = String.format(SECONDARY_MESSAGE, "out");

        addIssue(new PreciseIssue(this, issueLocation(tree, message)))
          .secondary(lastUsage.callee(), secondaryMessage);
        hasIssue.add(symbol);

      } else {
        usedInNewExpression.put(symbol, tree);
      }
    }

    super.visitNewExpression(tree);
  }

  private static IssueLocation issueLocation(NewExpressionTree newExpressionTree, String message) {
    return new IssueLocation(
      newExpressionTree.newKeyword(),
      newExpressionTree.expression(),
      message
    );
  }

  @CheckForNull
  private static Symbol getSymbol(ExpressionTree expression) {
    if (expression.is(Kind.IDENTIFIER_REFERENCE)) {
      return ((IdentifierTree) expression).symbol();
    }
    return null;
  }

  @Override
  public void visitScript(ScriptTree tree) {
    super.visitScript(tree);

    usedInCallExpression.clear();
    usedInNewExpression.clear();
  }
}
