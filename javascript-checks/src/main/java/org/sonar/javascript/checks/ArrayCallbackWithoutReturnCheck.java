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

import com.google.common.collect.ImmutableSet;
import java.util.HashSet;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.cfg.CfgBlock;
import org.sonar.javascript.cfg.ControlFlowGraph;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.SeCheck;
import org.sonar.javascript.se.builtins.BuiltInObjectSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.ReturnStatementTree;

@Rule(key = "S3796")
public class ArrayCallbackWithoutReturnCheck extends SeCheck {

  private static final String MESSAGE = "Add a \"return\" statement to this callback.";

  private Set<DotMemberExpressionTree> hasIssue = new HashSet<>();

  private static final Set<String> METHODS_WITH_CALLBACK = ImmutableSet.of(
    "every",
    "filter",
    "find",
    "findIndex",
    "map",
    "reduce",
    "reduceRight",
    "some",
    "sort"
  );

  @Override
  public void startOfExecution(Scope functionScope) {
    hasIssue.clear();
  }

  @Override
  public void beforeBlockElement(ProgramState currentState, Tree element) {
    if (element.is(Kind.DOT_MEMBER_EXPRESSION)) {
      DotMemberExpressionTree memberExpression = (DotMemberExpressionTree) element;

      if (isArrayPropertyExecuted(currentState) && METHODS_WITH_CALLBACK.contains(memberExpression.property().name())) {
        checkArgumentToBeFunctionWithReturn(memberExpression, 0);
      }

      if (isArrayFromMethod(memberExpression, currentState)) {
        checkArgumentToBeFunctionWithReturn(memberExpression, 1);
      }
    }

  }

  private void checkArgumentToBeFunctionWithReturn(DotMemberExpressionTree callee, int argumentIndex) {
    Tree parent = ((JavaScriptTree) callee).getParent();

    if (parent.is(Kind.CALL_EXPRESSION)) {
      CallExpressionTree callExpressionTree = (CallExpressionTree) parent;

      if (callExpressionTree.arguments().parameters().size() > argumentIndex) {
        Tree secondArgument = callExpressionTree.arguments().parameters().get(argumentIndex);

        if (secondArgument.is(Kind.FUNCTION_EXPRESSION, Kind.ARROW_FUNCTION) && !hasReturnWithValue((FunctionTree)secondArgument)) {
          raiseIssue(callee, secondArgument);
        }

      }
    }
  }

  private void raiseIssue(DotMemberExpressionTree memberExpression, Tree firstArgument) {
    if (hasIssue.contains(memberExpression)) {
      return;
    }

    SyntaxToken tokenToRaiseIssue;

    if (firstArgument.is(Kind.FUNCTION_EXPRESSION)) {
      tokenToRaiseIssue = ((FunctionExpressionTree) firstArgument).functionKeyword();
    } else {
      tokenToRaiseIssue = ((ArrowFunctionTree) firstArgument).doubleArrow();
    }

    addIssue(tokenToRaiseIssue, MESSAGE);
    hasIssue.add(memberExpression);
  }

  private static boolean hasReturnWithValue(FunctionTree functionTree) {
    if (functionTree.body().is(Kind.BLOCK)) {
      ControlFlowGraph cfg = ControlFlowGraph.build((BlockTree) functionTree.body());

      for (CfgBlock cfgBlock : cfg.blocks()) {
        if (cfgBlock.elements().isEmpty()) {
          continue;
        }

        Tree lastElement = cfgBlock.elements().get(cfgBlock.elements().size() - 1);
        if (lastElement.is(Kind.RETURN_STATEMENT) && ((ReturnStatementTree) lastElement).expression() != null) {
          return true;
        }
      }

      return false;
    }

    // for arrow function with expression body
    return true;
  }


  private static boolean isArrayPropertyExecuted(ProgramState currentState) {
    SymbolicValue symbolicValue = currentState.peekStack();
    Constraint constraint = currentState.getConstraint(symbolicValue);
    return constraint.isStricterOrEqualTo(Constraint.ARRAY);
  }

  private static boolean isArrayFromMethod(DotMemberExpressionTree memberExpression, ProgramState currentState) {
    SymbolicValue symbolicValue = currentState.peekStack();
    return symbolicValue.equals(BuiltInObjectSymbolicValue.ARRAY) && "from".equals(memberExpression.property().name());
  }
}
