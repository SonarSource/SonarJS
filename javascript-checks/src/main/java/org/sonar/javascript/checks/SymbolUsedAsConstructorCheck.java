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

import org.sonar.check.Rule;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.tree.KindSet;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.NewExpressionTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@JavaScriptRule
@Rule(key = "S3834")
public class SymbolUsedAsConstructorCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Remove this \"new\" operator.";

  private static final String SYMBOL = "Symbol";

  @Override
  public void visitNewExpression(NewExpressionTree tree) {
    if (isSymbol(tree.expression())) {
      raiseError(tree);
    }
  }

  /**
   * Returns true if the expression is the Symbol built-in, else returns false.
   * Specifically, returns false if the expression is "Symbol" but the built-in Symbol has been shadowed.
   */
  private boolean isSymbol(ExpressionTree expression) {
    if (expression.is(Kind.IDENTIFIER_REFERENCE)) {
      String name = ((IdentifierTree) expression).name();
      if (SYMBOL.equals(name) && !isSymbolShadowed(expression)) {
        return true;
      }
    }
    return false;
  }

  private boolean isSymbolShadowed(Tree tree) {
    Tree scopedTree = CheckUtils.getFirstAncestor(tree, KindSet.FUNCTION_KINDS, Kind.SCRIPT);
    Symbol symbolSymbol = getContext().getSymbolModel().getScope(scopedTree).lookupSymbol(SYMBOL);
    return !symbolSymbol.external() || hasWriteUsage(symbolSymbol);
  }

  private void raiseError(NewExpressionTree tree) {
    addIssue(tree.newKeyword(), MESSAGE).secondary(tree.expression());
  }

  private static boolean hasWriteUsage(Symbol symbol) {
    return symbol.usages().stream().anyMatch(usage -> usage.isWrite() || usage.isDeclaration());
  }

}
