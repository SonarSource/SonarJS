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
import org.sonar.javascript.checks.utils.FunctionReturns;
import org.sonar.javascript.tree.KindSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.ReturnStatementTree;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

import static org.sonar.javascript.checks.utils.FunctionReturns.getFunctionReturns;

@JavaScriptRule
@Rule(key = "S3801")
public class ConsistentReturnsCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "Refactor this function to use \"return\" consistently.";

  @Override
  public Set<Kind> nodesToVisit() {
    return ImmutableSet.copyOf(KindSet.FUNCTION_KINDS.getSubKinds());
  }

  @Override
  public void visitNode(Tree tree) {
    FunctionTree functionTree = (FunctionTree) tree;
    if (functionTree.body().is(Kind.BLOCK)) {

      BlockTree body = (BlockTree) functionTree.body();
      FunctionReturns functionReturns = getFunctionReturns(body);

      if (functionReturns.containsReturnWithoutValue() && functionReturns.containsReturnWithValue()) {
        raiseIssue(tree, functionReturns, body);
      }
    }
  }

  private void raiseIssue(Tree functionTree, FunctionReturns functionReturns, BlockTree body) {
    SyntaxToken tokenToRaiseIssue = functionTree.firstToken();
    if (functionTree.is(Kind.ARROW_FUNCTION)) {
      tokenToRaiseIssue = ((ArrowFunctionTree) functionTree).doubleArrowToken();
    }

    if (functionTree.is(Kind.GENERATOR_METHOD)) {
      tokenToRaiseIssue = ((MethodDeclarationTree) functionTree).name().firstToken();
    }

    PreciseIssue issue = addIssue(tokenToRaiseIssue, MESSAGE);
    for (ReturnStatementTree returnStatement : functionReturns.returnStatements()) {
      issue.secondary(returnStatement.returnKeyword(), returnStatement.expression() == null ? "Return without value" : "Return with value");
    }

    if (functionReturns.containsImplicitReturn()) {
      issue.secondary(body.closeCurlyBraceToken(), "Implicit return without value");
    }
  }

}
