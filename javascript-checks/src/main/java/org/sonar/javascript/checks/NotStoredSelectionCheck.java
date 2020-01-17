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

import com.google.common.base.Preconditions;
import com.google.common.collect.ArrayListMultimap;
import com.google.common.collect.ListMultimap;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.plugins.javascript.api.tree.SeparatedList;
import org.sonar.javascript.tree.symbols.type.ObjectType;
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
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;

@JavaScriptRule
@Rule(key = "S2762")
public class NotStoredSelectionCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Selection \"$( %s )\" is made %s times. It should be stored in a variable and reused.";
  private static final int DEFAULT = 2;

  @RuleProperty(
    key = "threshold",
    description = "Number of allowed repetition before triggering an issue",
    defaultValue = "" + DEFAULT)
  public int threshold = DEFAULT;

  private Deque<ListMultimap<String, CallExpressionTree>> selectors;

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

  private void checkForDuplications(ListMultimap<String, CallExpressionTree> selectors) {
    for (String selectorText : selectors.keySet()) {
      List<CallExpressionTree> references = selectors.get(selectorText);
      int numberOfDuplications = references.size();

      if (numberOfDuplications > threshold) {
        String message = String.format(MESSAGE, selectorText, numberOfDuplications);
        PreciseIssue issue = addIssue(references.get(0), message)
          .cost((double) numberOfDuplications - threshold);
        references.subList(1, references.size()).forEach(issue::secondary);
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
    selectors.push(ArrayListMultimap.create());
  }

  @Override
  public void visitCallExpression(CallExpressionTree tree) {
    if (tree.types().contains(ObjectType.FrameworkType.JQUERY_SELECTOR_OBJECT)) {
      LiteralTree parameter = getSelectorParameter(tree);
      if (parameter != null) {
        String value = parameter.value();
        selectors.peek().put(value, tree);
      }
    }
    super.visitCallExpression(tree);
  }

  private static LiteralTree getSelectorParameter(CallExpressionTree tree) {
    SeparatedList<ExpressionTree> parameters = tree.argumentClause().arguments();
    if (parameters.size() == 1 && parameters.get(0).is(Tree.Kind.STRING_LITERAL) && !isElementCreation((LiteralTree) parameters.get(0))) {
      return (LiteralTree) parameters.get(0);
    }
    return null;
  }

  /**
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
        if (parameter != null) {
          selectors.peek().remove(parameter.value(), tree);
        }
      }
    }
  }

}
