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

import com.google.common.collect.ImmutableSet;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.plugins.javascript.api.tree.SeparatedList;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@JavaScriptRule
@Rule(key = "S3533")
public class NonStandardImportCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Use a standard \"import\" statement instead of \"%s(...)\".";

  private static final Set<String> AMD_IMPORT_FUNCTIONS = ImmutableSet.of("require", "define");
  private static final String COMMON_JS_IMPORT_FUNCTION = "require";

  @Override
  public void visitCallExpression(CallExpressionTree tree) {
    if (tree.callee().is(Kind.IDENTIFIER_REFERENCE)) {
      IdentifierTree callee = (IdentifierTree) tree.callee();

      if (callee.scope().isGlobal()) {
        String name = callee.name();
        SeparatedList<ExpressionTree> parameters = tree.argumentClause().arguments();

        if (isAmdImport(name, parameters) || isCommonJsImport(name, parameters)) {
          addIssue(tree.callee(), String.format(MESSAGE, name));
        }
      }
    }
  }

  private static boolean isAmdImport(String callee, SeparatedList<ExpressionTree> parameters) {
    if (AMD_IMPORT_FUNCTIONS.contains(callee)) {
      if (parameters.size() == 3) {
        return firstIsStringLiteral(parameters) && lastIsFunction(parameters);

      } else if (parameters.size() == 2) {
        return lastIsFunction(parameters);
      }
    }
    return false;
  }

  private static boolean lastIsFunction(SeparatedList<ExpressionTree> parameters) {
    return (parameters.get(parameters.size() - 1)).types().contains(Type.Kind.FUNCTION);
  }

  private static boolean isCommonJsImport(String callee, SeparatedList<ExpressionTree> parameters) {
    return COMMON_JS_IMPORT_FUNCTION.equals(callee) && parameters.size() == 1 && firstIsStringLiteral(parameters);
  }

  private static boolean firstIsStringLiteral(SeparatedList<ExpressionTree> parameters) {
    return parameters.get(0).is(Kind.STRING_LITERAL);
  }
}
