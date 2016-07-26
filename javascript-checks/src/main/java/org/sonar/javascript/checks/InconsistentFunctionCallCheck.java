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
import org.sonar.plugins.javascript.api.tree.Tree;
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
  public void visitScript(ScriptTree tree) {
    super.visitScript(tree);

    usedInCallExpression.clear();
    usedInNewExpression.clear();
  }

  @Override
  public void visitCallExpression(CallExpressionTree tree) {
    visit(tree, tree.callee(), usedInNewExpression, usedInCallExpression, "");
    super.visitCallExpression(tree);
  }

  @Override
  public void visitNewExpression(NewExpressionTree tree) {
    visit(tree, tree.expression(), usedInCallExpression, usedInNewExpression, "out");
    super.visitNewExpression(tree);
  }

  private <T1 extends Tree, T2 extends Tree> void visit(
    T1 tree, ExpressionTree symbolTree,
    ListMultimap<Symbol, T2> otherTypeUsageMap, ListMultimap<Symbol, T1> thisTypeUsageMap, String withTail
  ) {
    Symbol symbol = getSymbol(symbolTree);
    if (symbol == null) {
      return;
    }

    List<T2> otherTypeUsages = otherTypeUsageMap.get(symbol);

    if (!otherTypeUsages.isEmpty() && !hasIssue.contains(symbol)) {

      T2 lastUsage = otherTypeUsages.get(otherTypeUsages.size() - 1);
      String message = String.format(MESSAGE, ((JavaScriptTree) lastUsage).getLine(), withTail);
      String secondaryMessage = String.format(SECONDARY_MESSAGE, withTail);

      addIssue(new PreciseIssue(this, issueLocation(tree, message)))
        .secondary(issueLocation(lastUsage, secondaryMessage));

      hasIssue.add(symbol);

    } else {
      thisTypeUsageMap.put(symbol, tree);
    }

  }

  private static <T extends Tree> IssueLocation issueLocation(T tree, String message) {
    if (tree.is(Kind.NEW_EXPRESSION)) {
      NewExpressionTree newExpressionTree = (NewExpressionTree) tree;
      return new IssueLocation(
        newExpressionTree.newKeyword(),
        newExpressionTree.expression(),
        message
      );

    } else {
      CallExpressionTree callExpressionTree = (CallExpressionTree) tree;
      return new IssueLocation(
        callExpressionTree.callee(),
        message
      );
    }
  }

  @CheckForNull
  private static Symbol getSymbol(ExpressionTree expression) {
    if (expression.is(Kind.IDENTIFIER_REFERENCE)) {
      return ((IdentifierTree) expression).symbol();
    }
    return null;
  }
}
