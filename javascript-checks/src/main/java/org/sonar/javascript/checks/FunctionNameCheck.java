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

import java.util.regex.Pattern;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.PairPropertyTree;
import org.sonar.plugins.javascript.api.tree.statement.VariableDeclarationTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "S100")
public class FunctionNameCheck extends DoubleDispatchVisitorCheck {

  public static final String DEFAULT = "^[_a-z][a-zA-Z0-9]*$";
  private static final String MESSAGE = "Rename this '%s' function to match the regular expression %s";
  private Pattern pattern = null;

  @RuleProperty(
    key = "format",
    description = "Regular expression used to check the function names against.",
    defaultValue = "" + DEFAULT)
  public String format = DEFAULT;

  @Override
  public void visitScript(ScriptTree tree) {
    pattern = Pattern.compile(format);
    super.visitScript(tree);
  }

  @Override
  public void visitMethodDeclaration(MethodDeclarationTree tree) {
    checkName(tree.name());
    super.visitMethodDeclaration(tree);
  }

  @Override
  public void visitPairProperty(PairPropertyTree tree) {
    if (isFunctionExpression(tree.value())) {
      checkName(tree.key());
    }
    super.visitPairProperty(tree);
  }

  @Override
  public void visitFunctionDeclaration(FunctionDeclarationTree tree) {
    checkName(tree.name());
    super.visitFunctionDeclaration(tree);
  }

  @Override
  public void visitVariableDeclaration(VariableDeclarationTree tree) {
    for (BindingElementTree bindingElement : tree.variables()) {
      if (bindingElement.is(Kind.INITIALIZED_BINDING_ELEMENT)) {
        InitializedBindingElementTree initializedBindingElement = (InitializedBindingElementTree) bindingElement;
        if (isFunctionExpression(initializedBindingElement.right())) {
          checkName(initializedBindingElement.left());
        }
      }
    }
    super.visitVariableDeclaration(tree);
  }

  private static boolean isFunctionExpression(Tree tree) {
    return tree.is(Kind.FUNCTION_EXPRESSION, Kind.GENERATOR_FUNCTION_EXPRESSION, Kind.ARROW_FUNCTION);
  }

  private void checkName(Tree tree) {
    if (tree instanceof IdentifierTree) {
      String name = ((IdentifierTree) tree).name();

      if (!pattern.matcher(name).matches()) {
        addIssue(tree, String.format(MESSAGE, name, format));
      }
    }
  }
}
