/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableSet;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.tree.KindSet;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

@Rule(key = "FunctionDefinitionInsideLoop")
public class FunctionDefinitionInsideLoopCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "Define this function outside of a loop.";
  private static final Set<String> ALLOWED_CALLBACKS = ImmutableSet.of("replace", "forEach", "filter", "map");

  private Deque<Tree> functionAndLoopScopes = new ArrayDeque<>();

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.<Kind>builder()
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
        && ReferencesVisitor.usesVariableFromOuterScope(functionTree, functionAndLoopScopes.peek())) {

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
    JavaScriptTree parent = ((JavaScriptTree) functionTree).getParent();

    if (parent.is(Kind.ARGUMENTS)) {
      CallExpressionTree callExpression = (CallExpressionTree) parent.getParent();

      if (callExpression.callee().is(Kind.DOT_MEMBER_EXPRESSION)) {
        String calledMethod = ((DotMemberExpressionTree) callExpression.callee()).property().name();
        return ALLOWED_CALLBACKS.contains(calledMethod);
      }

    }
    return false;
  }

  private static boolean isIIFE(FunctionTree functionTree) {
    JavaScriptTree parent = ((JavaScriptTree) functionTree).getParent();
    return parent.is(Kind.PARENTHESISED_EXPRESSION) && parent.getParent().is(Kind.CALL_EXPRESSION, Kind.DOT_MEMBER_EXPRESSION);
  }

  private static Tree getTokenForIssueLocation(Tree tree) {
    if (tree.is(Kind.ARROW_FUNCTION)) {
      return ((ArrowFunctionTree) tree).doubleArrow();
    } else {
      return ((JavaScriptTree) tree).getFirstToken();
    }
  }

  private boolean insideLoop() {
    return functionAndLoopScopes.peek().is(KindSet.LOOP_KINDS);
  }

  private static class ReferencesVisitor extends DoubleDispatchVisitor {

    private FunctionTree functionTree;
    private Tree loopTree;
    private boolean usesVariableFromOuterScope = false;

    private ReferencesVisitor(FunctionTree functionTree, Tree loopTree) {
      this.functionTree = functionTree;
      this.loopTree = loopTree;
    }

    static boolean usesVariableFromOuterScope(FunctionTree functionTree, Tree loop) {
      ReferencesVisitor referencesVisitor = new ReferencesVisitor(functionTree, loop);
      referencesVisitor.scan(functionTree);
      return referencesVisitor.usesVariableFromOuterScope;
    }

    @Override
    public void visitIdentifier(IdentifierTree tree) {
      Symbol symbol = tree.symbol();
      if (symbol != null && !symbol.is(Symbol.Kind.LET_VARIABLE)) {
        Tree symbolScopeTree = symbol.scope().tree();
        if (((JavaScriptTree) symbolScopeTree).isAncestorOf((JavaScriptTree) functionTree) && !hasConstValue(symbol)) {
          usesVariableFromOuterScope = true;
        }
      }
    }

    /**
     * Returns true is symbol is written only once and outside the loop
     */
    private boolean hasConstValue(Symbol symbol) {
      for (Usage usage : symbol.usages()) {
        if (!usage.isDeclaration() && usage.isWrite()) {
          return false;
        }

        if (usage.isDeclaration() && usage.isWrite() && ((JavaScriptTree) loopTree).isAncestorOf((JavaScriptTree) usage.identifierTree())) {
          return false;
        }
      }
      return true;
    }
  }
}
