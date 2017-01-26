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

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import javax.annotation.Nullable;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.tree.TreeKinds;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ConditionalExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BreakStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.CatchBlockTree;
import org.sonar.plugins.javascript.api.tree.statement.ContinueStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.DoWhileStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ElseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.ForObjectStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.IfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.WhileStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

import static org.sonar.plugins.javascript.api.tree.Tree.Kind.ARROW_FUNCTION;
import static org.sonar.plugins.javascript.api.tree.Tree.Kind.CONDITIONAL_AND;
import static org.sonar.plugins.javascript.api.tree.Tree.Kind.CONDITIONAL_OR;

@Rule(key = "S3776")
public class CognitiveComplexityFunctionCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "Refactor this function to reduce its Cognitive Complexity from %s to the %s allowed.";
  private static final int DEFAULT_THRESHOLD = 15;

  @RuleProperty(
    key = "threshold",
    description = "The maximum authorized complexity.",
    defaultValue = "" + DEFAULT_THRESHOLD)
  private int threshold = DEFAULT_THRESHOLD;

  /* When complexity of nesting function is considered for this check, we ignore all nested in it functions */
  private Set<Tree> ignoredNestedFunctions = new HashSet<>();
  private final CognitiveComplexity cognitiveComplexity = new CognitiveComplexity();

  @Override
  public List<Kind> nodesToVisit() {
    return TreeKinds.functionKinds();
  }

  @Override
  public void visitFile(Tree scriptTree) {
    ignoredNestedFunctions.clear();
    super.visitFile(scriptTree);
  }

  @Override
  public void visitNode(Tree tree) {
    if (!ignoredNestedFunctions.contains(tree)) {
      tree.accept(cognitiveComplexity);
    }
  }

  private class CognitiveComplexity extends DoubleDispatchVisitor {
    private int nestingLevel;
    private int ownComplexity;
    private int nestedFunctionComplexity;

    private boolean functionContainsStructuralComplexity;

    private List<IssueLocation> secondaryIssueLocations = new ArrayList<>();

    private Tree currentFunction = null;
    private Set<Tree> nestedFunctions = new HashSet<>();
    private Deque<Tree> functionStack = new ArrayDeque<>();


    private void visitFunction(FunctionTree tree) {
      if (currentFunction == null) {
        initComplexityCalculation(tree);

      } else {
        nestedFunctions.add(tree);
        functionStack.push(tree);
        nestingLevel++;
      }
    }

    private void initComplexityCalculation(FunctionTree tree) {
      nestingLevel = 0;
      secondaryIssueLocations.clear();
      ownComplexity = 0;
      nestedFunctionComplexity = 0;
      functionContainsStructuralComplexity = false;
      currentFunction = tree;
      nestedFunctions.clear();

      functionStack.clear();
      functionStack.push(currentFunction);
    }

    private void leaveFunction(FunctionTree tree) {
      if (tree.equals(currentFunction)) {
        checkComplexity();
        currentFunction = null;

      } else {
        nestingLevel--;
        functionStack.pop();
      }
    }

    private void checkComplexity() {
      int complexity;

      if (functionContainsStructuralComplexity) {
        complexity = ownComplexity + nestedFunctionComplexity;
        ignoredNestedFunctions.addAll(nestedFunctions);

      } else {
        complexity = ownComplexity;
      }

      if (complexity > threshold) {
        raiseIssue(complexity);
      }
    }

    @Override
    public void visitIfStatement(IfStatementTree tree) {
      if (isElseIf(tree)) {
        addComplexityWithoutNesting(tree.ifKeyword());

      } else {
        addComplexityWithNesting(tree.ifKeyword());
      }

      visit(tree.condition());
      visitWithNesting(tree.statement());
      visit(tree.elseClause());
    }

    @Override
    public void visitElseClause(ElseClauseTree tree) {
      if (tree.statement().is(Kind.IF_STATEMENT)) {
        visit(tree.statement());

      } else {
        addComplexityWithoutNesting(tree.elseKeyword());
        visitWithNesting(tree.statement());
      }
    }

    @Override
    public void visitWhileStatement(WhileStatementTree tree) {
      visitLoop(tree.whileKeyword(), tree.statement(), tree.condition());
    }

    @Override
    public void visitDoWhileStatement(DoWhileStatementTree tree) {
      visitLoop(tree.doKeyword(), tree.statement(), tree.condition());
    }

    @Override
    public void visitForStatement(ForStatementTree tree) {
      visitLoop(tree.forKeyword(), tree.statement(), tree.init(), tree.condition(), tree.update());
    }

    @Override
    public void visitForObjectStatement(ForObjectStatementTree tree) {
      visitLoop(tree.forKeyword(), tree.statement(), tree.variableOrExpression(), tree.expression());
    }

    private void visitLoop(SyntaxToken secondaryLocationToken, Tree loopBody, Tree ... notNestedElements) {
      addComplexityWithNesting(secondaryLocationToken);
      visit(notNestedElements);
      visitWithNesting(loopBody);
    }

    @Override
    public void visitCatchBlock(CatchBlockTree tree) {
      addComplexityWithNesting(tree.catchKeyword());
      visitWithNesting(tree.block());
    }

    @Override
    public void visitSwitchStatement(SwitchStatementTree tree) {
      addComplexityWithNesting(tree.switchKeyword());
      nestingLevel++;
      super.visitSwitchStatement(tree);
      nestingLevel--;
    }

    @Override
    public void visitBinaryExpression(BinaryExpressionTree tree) {
      if (tree.is(CONDITIONAL_AND, CONDITIONAL_OR)) {
        JavaScriptTree javaScriptTree = (JavaScriptTree) tree;
        ExpressionTree child = CheckUtils.removeParenthesis(tree.leftOperand());
        boolean childOfSameKind = child.is(javaScriptTree.getKind());

        if (!childOfSameKind) {
          addComplexityWithoutNesting(tree.operator());
        }
      }

      super.visitBinaryExpression(tree);
    }

    @Override
    public void visitConditionalExpression(ConditionalExpressionTree tree) {
      addComplexityWithNesting(tree.query());

      visit(tree.condition());

      visitWithNesting(tree.trueExpression());
      visitWithNesting(tree.falseExpression());
    }

    @Override
    public void visitBreakStatement(BreakStatementTree tree) {
      visitJumpStatement(tree.breakKeyword(), tree.label());
      super.visitBreakStatement(tree);
    }

    @Override
    public void visitContinueStatement(ContinueStatementTree tree) {
      visitJumpStatement(tree.continueKeyword(), tree.label());
      super.visitContinueStatement(tree);
    }

    private void visitJumpStatement(SyntaxToken keyword, @Nullable IdentifierTree label) {
      if (label != null) {
        addComplexityWithoutNesting(keyword);
      }
    }

    private void visit(Tree ... trees) {
      for (Tree tree : trees) {
        if (tree != null) {
          tree.accept(this);
        }
      }
    }

    private void visitWithNesting(Tree tree) {
      nestingLevel++;
      tree.accept(this);
      nestingLevel--;
    }

    private void addComplexityWithNesting(SyntaxToken secondaryLocationToken) {
      if (functionStack.peek().equals(currentFunction)) {
        functionContainsStructuralComplexity = true;
      }
      addComplexity(nestingLevel + 1, secondaryLocationToken);
    }

    private void addComplexityWithoutNesting(SyntaxToken secondaryLocationToken) {
      addComplexity(1, secondaryLocationToken);
    }

    private void addComplexity(int addedComplexity, SyntaxToken secondaryLocationToken) {
      if (functionStack.peek().equals(currentFunction)) {
        ownComplexity += addedComplexity;
      } else {
        nestedFunctionComplexity += addedComplexity;
      }

      secondaryIssueLocations.add(new IssueLocation(secondaryLocationToken, secondaryMessage(addedComplexity)));
    }

    private void raiseIssue(int complexity) {
      String message = String.format(MESSAGE, complexity, threshold);

      SyntaxToken primaryLocation = ((JavaScriptTree) currentFunction).getFirstToken();
      if (currentFunction.is(ARROW_FUNCTION)) {
        primaryLocation = ((ArrowFunctionTree) currentFunction).doubleArrow();
      }

      PreciseIssue issue = addIssue(primaryLocation, message).cost(complexity - (double)threshold);

      secondaryIssueLocations.forEach(issue::secondary);
    }


    private String secondaryMessage(int complexity) {
      if (complexity == 1) {
        return "+1";

      } else{
        return String.format("+%s (incl %s for nesting)", complexity, complexity - 1);
      }
    }

    @Override
    public void visitFunctionDeclaration(FunctionDeclarationTree tree) {
      visitFunction(tree);
      super.visitFunctionDeclaration(tree);
      leaveFunction(tree);
    }

    @Override
    public void visitArrowFunction(ArrowFunctionTree tree) {
      visitFunction(tree);
      super.visitArrowFunction(tree);
      leaveFunction(tree);
    }

    @Override
    public void visitFunctionExpression(FunctionExpressionTree tree) {
      visitFunction(tree);
      super.visitFunctionExpression(tree);
      leaveFunction(tree);
    }

    @Override
    public void visitMethodDeclaration(MethodDeclarationTree tree) {
      visitFunction(tree);
      super.visitMethodDeclaration(tree);
      leaveFunction(tree);
    }

    private boolean isElseIf(IfStatementTree tree) {
      return ((JavaScriptTree)tree).getParent().is(Kind.ELSE_CLAUSE);
    }

  }
  public void setThreshold(int threshold) {
    this.threshold = threshold;
  }
}
