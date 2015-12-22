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

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.symbols.type.FunctionType;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.symbols.Type.Callability;
import org.sonar.plugins.javascript.api.symbols.Type.Kind;
import org.sonar.plugins.javascript.api.symbols.TypeSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.NewExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxTrivia;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "S2999",
  name = "\"new\" operators should be used with functions",
  priority = Priority.CRITICAL,
  tags = {Tags.BUG})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.INSTRUCTION_RELIABILITY)
@SqaleConstantRemediation("10min")
public class NewOperatorMisuseCheck extends BaseTreeVisitor {

  private static final String MESSAGE = "Replace %s with a constructor function.";
  public static final boolean CONSIDER_JSDOC = false;

  @RuleProperty(
    key = "considerJSDoc",
    description = "Consider only functions with @constructor tag as constructor functions",
    defaultValue = "" + CONSIDER_JSDOC)
  public boolean considerJSDoc = CONSIDER_JSDOC;

  @Override
  public void visitNewExpression(NewExpressionTree tree) {
    ExpressionTree expression = tree.expression();

    if (!expression.types().isEmpty() && !isConstructor(expression.types())) {
      String expressionStr = "this function";
      if (!CheckUtils.removeParenthesis(expression).is(Tree.Kind.FUNCTION_EXPRESSION)) {
        expressionStr = CheckUtils.asString(expression);
      }
      getContext().addIssue(this, expression, String.format(MESSAGE, expressionStr));
    }

    super.visitNewExpression(tree);
  }

  private boolean isConstructor(TypeSet types) {
    boolean isConstructor = true;


    Type type = types.getUniqueKnownType();

    if (type != null) {
      if (type.callability().equals(Callability.NON_CALLABLE)) {
        isConstructor = false;
      } else if (considerJSDoc && type.kind().equals(Kind.FUNCTION)) {
        isConstructor = hasJSDocAnnotation(((FunctionType) type).functionTree());
      }
    }

    return isConstructor;
  }

  private static boolean hasJSDocAnnotation(FunctionTree funcDec) {
    for (SyntaxTrivia trivia : ((JavaScriptTree) funcDec).getFirstToken().trivias()) {
      if (trivia.text().contains("@constructor") || trivia.text().contains("@class")) {
        return true;
      }
    }
    return false;
  }

}
