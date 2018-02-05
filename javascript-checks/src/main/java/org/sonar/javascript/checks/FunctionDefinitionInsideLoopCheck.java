/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.tree.KindSet;
import org.sonar.javascript.tree.impl.declaration.FunctionTreeImpl;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

@Rule(key = "FunctionDefinitionInsideLoop")
public class FunctionDefinitionInsideLoopCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "Define this function outside of a loop.";
  private static final Set<String> ALLOWED_CALLBACKS = ImmutableSet.of(
    "replace",
    "forEach",
    "filter",
    "map",
    "find",
    "findIndex",
    "every",
    "some",
    "reduce",
    "reduceRight",
    "sort");

  private Deque<Tree> functionAndLoopScopes = new ArrayDeque<>();

  @Override
  public Set<Kind> nodesToVisit() {
    return ImmutableSet.<Kind>builder()
      .addAll(KindSet.LOOP_KINDS.getSubKinds())
      .addAll(KindSet.FUNCTION_KINDS.getSubKinds())
      .build();
  }

  @Override
  public void visitFile(Tree scriptTree) {
    functionAndLoopScopes.clear();
    functionAndLoopScopes.push(scriptTree);
  }

  @Override
  public void visitNode(Tree tree) {
    if (tree.is(KindSet.FUNCTION_KINDS) && insideLoop()) {
      FunctionTree functionTree = (FunctionTree) tree;

      if (!isIIFE(functionTree)
        && !isAllowedCallback(functionTree)
        && usesVariableFromOuterScope(functionTree, functionAndLoopScopes.peek())) {

        addIssue(getTokenForIssueLocation(tree), MESSAGE);
      }
    }

    functionAndLoopScopes.push(tree);
  }

  @Override
  public void leaveNode(Tree tree) {
    functionAndLoopScopes.pop();
  }

  private static boolean isAllowedCallback(FunctionTree functionTree) {
    Tree parent = functionTree.parent();

    if (parent.is(Kind.ARGUMENT_LIST) && parent.parent().is(Kind.CALL_EXPRESSION)) {
      CallExpressionTree callExpression = (CallExpressionTree) parent.parent();

      if (callExpression.callee().is(Kind.DOT_MEMBER_EXPRESSION)) {
        String calledMethod = ((DotMemberExpressionTree) callExpression.callee()).property().name();
        return ALLOWED_CALLBACKS.contains(calledMethod);
      }

    }
    return false;
  }

  private static boolean isIIFE(FunctionTree functionTree) {
    Tree parent = functionTree.parent();
    return parent.is(Kind.PARENTHESISED_EXPRESSION) && parent.parent().is(Kind.CALL_EXPRESSION, Kind.DOT_MEMBER_EXPRESSION);
  }

  private static Tree getTokenForIssueLocation(Tree tree) {
    if (tree.is(Kind.ARROW_FUNCTION)) {
      return ((ArrowFunctionTree) tree).doubleArrowToken();
    } else {
      return tree.firstToken();
    }
  }

  private boolean insideLoop() {
    return functionAndLoopScopes.peek().is(KindSet.LOOP_KINDS);
  }

  private static boolean usesVariableFromOuterScope(FunctionTree functionTree, Tree loop) {
    return ((FunctionTreeImpl) functionTree).outerScopeSymbolUsages()
      .map(Usage::symbol)
      .filter(symbol -> !symbol.is(Symbol.Kind.LET_VARIABLE))
      .anyMatch(symbol -> !hasConstValue(symbol, loop));
  }

  /**
   * Returns true if symbol is written only once and outside the loop
   */
  private static boolean hasConstValue(Symbol symbol, Tree loopTree) {
    for (Usage usage : symbol.usages()) {
      if (!usage.isDeclaration() && usage.isWrite()) {
        return false;
      }

      if (usage.isDeclaration() && usage.isWrite() && loopTree.isAncestorOf(usage.identifierTree())) {
        return false;
      }
    }
    return true;
  }

}
