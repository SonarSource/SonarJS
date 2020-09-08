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

import com.google.common.collect.ArrayListMultimap;
import com.google.common.collect.ListMultimap;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.ExportClauseTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.WithStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;

@JavaScriptRule
@Rule(key = "S3827")
public class ReferenceErrorCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "\"%s\" does not exist. Change its name or declare it so that its usage doesn't result in a \"ReferenceError\".";

  private final ListMultimap<String, IdentifierTree> undeclaredIdentifiersByName = ArrayListMultimap.create();
  private final Set<String> excludedNames = new HashSet<>();

  @Override
  public void visitScript(ScriptTree tree) {
    undeclaredIdentifiersByName.clear();
    excludedNames.clear();

    super.visitScript(tree);

    for (String name : undeclaredIdentifiersByName.keySet()) {
      List<IdentifierTree> identifiers = undeclaredIdentifiersByName.get(name);
      PreciseIssue issue = addIssue(identifiers.get(0), String.format(MESSAGE, name));
      identifiers.subList(1, identifiers.size()).stream().forEach(issue::secondary);
    }
  }

  @Override
  public void visitIdentifier(IdentifierTree identifier) {
    if (identifier.is(Kind.IDENTIFIER_REFERENCE)
      && !identifier.symbol().isPresent()
      && !"undefined".equals(identifier.name())
      && !excludedNames.contains(identifier.name())) {

      undeclaredIdentifiersByName.put(identifier.name(), identifier);

    }
    super.visitIdentifier(identifier);
  }

  @Override
  public void visitWithStatement(WithStatementTree tree) {
    // Don't visit with statements, we cannot resolve
  }

  @Override
  public void visitUnaryExpression(UnaryExpressionTree unaryExpression) {
    if (unaryExpression.is(Kind.TYPEOF)) {
      ExpressionTree expression = unaryExpression.expression();
      if (expression.is(Kind.IDENTIFIER_REFERENCE)) {
        excludedNames.add(((IdentifierTree) expression).name());
      }
    }
    super.visitUnaryExpression(unaryExpression);
  }

  @Override
  public void visitExportClause(ExportClauseTree tree) {
    if (tree.fromClause() != null) {
      // don't visit identifiers exported from another module
      return;
    }
    super.visitExportClause(tree);
  }
}
