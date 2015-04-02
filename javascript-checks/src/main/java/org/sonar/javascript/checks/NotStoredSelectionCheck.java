/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * dev@sonar.codehaus.org
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.javascript.checks;

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.ast.visitors.BaseTreeVisitor;
import org.sonar.javascript.model.implementations.SeparatedList;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.FunctionDeclarationTree;
import org.sonar.javascript.model.interfaces.declaration.InitializedBindingElementTree;
import org.sonar.javascript.model.interfaces.declaration.ScriptTree;
import org.sonar.javascript.model.interfaces.expression.ArrowFunctionTree;
import org.sonar.javascript.model.interfaces.expression.AssignmentExpressionTree;
import org.sonar.javascript.model.interfaces.expression.CallExpressionTree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.expression.FunctionExpressionTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.javascript.model.interfaces.expression.LiteralTree;
import org.sonar.squidbridge.annotations.SqaleLinearWithOffsetRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

@Rule(
    key = "S2762",
    name = "Selections should be stored",
    priority = Priority.MAJOR,
    tags = {Tags.JQUERY, Tags.PERFORMANCE, Tags.USER_EXPERIENCE})
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.CPU_EFFICIENCY)
@SqaleLinearWithOffsetRemediation(
    coeff = "1min",
    offset = "2min",
    effortToFixDescription = "number of times selection is re-made.")
public class NotStoredSelectionCheck extends BaseTreeVisitor {

  private static final int DEFAULT = 2;

  @RuleProperty(
      key = "threshold",
      description = "Number of allowed repetition before triggering an issue",
      defaultValue = "" + DEFAULT)
  public int threshold = DEFAULT;

  private Deque<List<LiteralTree>> selectors;

  @Override
  public void visitScript(ScriptTree tree) {
    selectors = new ArrayDeque<>();
    startScopeBlock();
    super.visitScript(tree);
    finishScopeBlock();
  }

  private void finishScopeBlock() {
    checkForDuplications(selectors.pop());
  }

  private void checkForDuplications(List<LiteralTree> selectors) {
    class Entry {
      private Integer count;
      private LiteralTree literalTree;

      Entry(LiteralTree literalTree) {
        this.literalTree = literalTree;
        this.count = 1;
      }

      void inc() {
        this.count++;
      }
    }
    Map<String, Entry> duplications = new HashMap<>();
    for (LiteralTree literal : selectors) {
      String value = literal.value();
      Entry entry = duplications.get(value);
      if (entry != null) {
        entry.inc();
      } else {
        duplications.put(value, new Entry(literal));
      }
    }
    for (Entry entry : duplications.values()) {
      if (entry.count > threshold) {
        getContext().addIssue(this, entry.literalTree, "This selection is made multiple times. It should be stored in a variable and reused.", (double) entry.count - threshold);
      }
    }
  }

  @Override
  public void visitFunctionDeclaration(FunctionDeclarationTree tree) {
    startScopeBlock();
    super.visitFunctionDeclaration(tree);
    finishScopeBlock();
  }

  @Override
  public void visitFunctionExpression(FunctionExpressionTree tree) {
    startScopeBlock();
    super.visitFunctionExpression(tree);
    finishScopeBlock();
  }

  @Override
  public void visitArrowFunction(ArrowFunctionTree tree) {
    startScopeBlock();
    super.visitArrowFunction(tree);
    finishScopeBlock();
  }

  private void startScopeBlock() {
    selectors.push(new LinkedList<LiteralTree>());
  }

  @Override
  public void visitCallExpression(CallExpressionTree tree) {
    if (isSelector(tree)) {
      LiteralTree parameter = getSelectorParameter(tree);
      if (parameter != null) {
        List<LiteralTree> currentSelectors = selectors.peek();
        currentSelectors.add(parameter);
      }
    }
    super.visitCallExpression(tree);
  }

  private LiteralTree getSelectorParameter(CallExpressionTree tree) {
    SeparatedList<Tree> parameters = tree.arguments().parameters();
    if (parameters.size() == 1 && parameters.get(0).is(Tree.Kind.STRING_LITERAL)) {
      return (LiteralTree) parameters.get(0);
    }
    return null;
  }

  private boolean isSelector(CallExpressionTree callExpressionTree) {
    ExpressionTree callee = callExpressionTree.callee();
    if (callee.is(Tree.Kind.IDENTIFIER_REFERENCE)) {
      String calleeName = ((IdentifierTree) callee).identifierToken().text();
      return "$".equals(calleeName);
    }
    return false;
  }

  @Override
  public void visitAssignmentExpression(AssignmentExpressionTree tree) {
    super.visitAssignmentExpression(tree);
    checkForSelectors(tree.expression());
  }

  @Override
  public void visitInitializedBindingElement(InitializedBindingElementTree tree) {
    super.visitInitializedBindingElement(tree);
    checkForSelectors(tree.right());
  }

  private void checkForSelectors(ExpressionTree tree) {
    if (tree.is(Tree.Kind.CALL_EXPRESSION)) {
      CallExpressionTree callExpressionTree = (CallExpressionTree) tree;
      if (isSelector(callExpressionTree)) {
        LiteralTree parameter = getSelectorParameter(callExpressionTree);
        if (parameter != null){
          selectors.peek().remove(parameter);
        }
      }
    }
  }


}
