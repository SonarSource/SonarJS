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

import java.util.List;
import org.sonar.api.server.rule.RulesDefinition.SubCharacteristics;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.tree.impl.SeparatedList;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.ParameterListTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.ReturnStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "S3524",
  name = "Braces and parentheses should be used consistently with arrow functions",
  priority = Priority.INFO,
  tags = {Tags.ES2015, Tags.CONVENTION})
@SqaleSubCharacteristic(SubCharacteristics.READABILITY)
@SqaleConstantRemediation("2min")
public class ArrowFunctionConventionCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE_ADD_PARAMETER = "Add parentheses around the parameter of this arrow function.";
  private static final String MESSAGE_ADD_BODY = "Add curly braces and \"return\" to this arrow function body.";
  private static final String MESSAGE_REMOVE_PARAMETER = "Remove parentheses around the parameter of this arrow function.";
  private static final String MESSAGE_REMOVE_BODY = "Remove curly braces and \"return\" from this arrow function body.";

  private static final boolean DEFAULT_PARAMETER_PARENS = false;
  private static final boolean DEFAULT_BODY_BRACES = false;

  @RuleProperty(
    key = "parameter_parens",
    description = "True to require parentheses around parameters. False to forbid them for single parameter.",
    defaultValue = "" + DEFAULT_PARAMETER_PARENS)
  private boolean parameterParens = DEFAULT_PARAMETER_PARENS;

  @RuleProperty(
    key = "body_braces",
    description = "True to require curly braces around function body. False to forbid them for single-return bodies.",
    defaultValue = "" + DEFAULT_BODY_BRACES)
  private boolean bodyBraces = DEFAULT_BODY_BRACES;

  public void setParameterParens(boolean value) {
    parameterParens = value;
  }
  public void setBodyBraces(boolean value) {
    bodyBraces = value;
  }

  @Override
  public void visitArrowFunction(ArrowFunctionTree tree) {
    checkParameterClause(tree);
    checkBody(tree);

    super.visitArrowFunction(tree);
  }

  private void checkBody(ArrowFunctionTree tree) {
    boolean hasBodyBraces = tree.body().is(Kind.BLOCK);

    if (bodyBraces && !hasBodyBraces) {
      addIssue(tree.body(), MESSAGE_ADD_BODY);
    }

    if (!bodyBraces && hasBodyBraces) {
      List<StatementTree> statements = ((BlockTree) tree.body()).statements();
      if (statements.size() == 1) {
        StatementTree statement = statements.get(0);
        if (statement.is(Kind.RETURN_STATEMENT)
          && ((ReturnStatementTree) statement).expression() != null
          && !((ReturnStatementTree) statement).expression().is(Kind.OBJECT_LITERAL)) {
          addIssue(tree.body(), MESSAGE_REMOVE_BODY);
        }
      }
    }
  }

  private void checkParameterClause(ArrowFunctionTree tree) {
    boolean hasParameterParens = tree.parameterClause().is(Kind.FORMAL_PARAMETER_LIST);

    if (parameterParens && !hasParameterParens) {
      addIssue(tree.parameterClause(), MESSAGE_ADD_PARAMETER);
    }

    if (!parameterParens && hasParameterParens) {
      SeparatedList<Tree> parameters = ((ParameterListTree) tree.parameterClause()).parameters();
      if (parameters.size() == 1 && parameters.get(0).is(Kind.BINDING_IDENTIFIER)) {
        addIssue(tree.parameterClause(), MESSAGE_REMOVE_PARAMETER);
      }
    }
  }
}
