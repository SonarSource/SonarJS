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

import com.google.common.base.Preconditions;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.ast.resolve.type.ObjectType;
import org.sonar.javascript.model.internal.SeparatedList;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
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
        String message = String.format("Selection \"$( %s )\" is made %s times. It should be stored in a variable and reused.", entry.literalTree.value(), entry.count);
        getContext().addIssue(this, entry.literalTree, message, (double) entry.count - threshold);
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
    if (tree.types().contains(ObjectType.FrameworkType.JQUERY_SELECTOR_OBJECT)) {
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
    if (parameters.size() == 1 && parameters.get(0).is(Tree.Kind.STRING_LITERAL) && !isElementCreation((LiteralTree) parameters.get(0))) {
      return (LiteralTree) parameters.get(0);
    }
    return null;
  }

  /**
   *
   * @param literalTree string literal argument of jQuery()
   * @return true if argument looks like HTML (e.g. "<div></div>")
   */
  private static boolean isElementCreation(LiteralTree literalTree) {
    Preconditions.checkArgument(literalTree.is(Tree.Kind.STRING_LITERAL));
    String value = literalTree.value();
    value = value.substring(1, value.length() - 1);
    return value.startsWith("<") && value.endsWith(">");
  }

  @Override
  public void visitAssignmentExpression(AssignmentExpressionTree tree) {
    super.visitAssignmentExpression(tree);
    lookForException(tree.expression());
  }

  @Override
  public void visitInitializedBindingElement(InitializedBindingElementTree tree) {
    super.visitInitializedBindingElement(tree);
    lookForException(tree.right());
  }

  private void lookForException(ExpressionTree tree) {
    if (tree.is(Tree.Kind.CALL_EXPRESSION)) {
      CallExpressionTree callExpressionTree = (CallExpressionTree) tree;
      if (callExpressionTree.types().contains(ObjectType.FrameworkType.JQUERY_SELECTOR_OBJECT)) {
        LiteralTree parameter = getSelectorParameter(callExpressionTree);
        if (parameter != null){
          selectors.peek().remove(parameter);
        }
      }
    }
  }


}
