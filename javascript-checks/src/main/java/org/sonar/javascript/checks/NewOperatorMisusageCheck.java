package org.sonar.javascript.checks;
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
import com.sonar.sslr.api.Trivia;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.ast.resolve.type.FunctionTree;
import org.sonar.javascript.ast.resolve.type.FunctionType;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.NewExpressionTree;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import java.util.Set;

@Rule(
  key = "S2999",
  name = "\"new\" operators should be used with functions",
  priority = Priority.CRITICAL,
  tags = {Tags.BUG})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.INSTRUCTION_RELIABILITY)
@SqaleConstantRemediation("10min")
public class NewOperatorMisusageCheck extends BaseTreeVisitor {

  public static final boolean CONSIDER_JSDOC = false;

  @RuleProperty(
    key = "considerJSDoc",
    description = "Consider only functions with @constructor tag as constructor functions",
    defaultValue = "" + CONSIDER_JSDOC)
  public boolean considerJSDoc = CONSIDER_JSDOC;

  @Override
  public void visitNewExpression(NewExpressionTree tree) {
    ExpressionTree expression = tree.expression();

    if (!expression.types().isEmpty() && isNotConstructor(expression.types())) {
      getContext().addIssue(this, expression, String.format("Replace %s with a constructor function.", CheckUtils.asString(expression)));
    }

    super.visitNewExpression(tree);
  }

  private boolean isNotConstructor(Set<Type> types) {
    boolean isConstructor = false;
    boolean isUnknown = false;

    for (Type t : types) {
      if (t.kind() == Type.Kind.FUNCTION) {
        isConstructor = considerJSDoc ? hasJSDocAnnotation(((FunctionType) t).functionTree()) : true;

      } else if (t.kind() == Type.Kind.UNKNOWN) {
        isUnknown = true;
      }
    }

    return !isConstructor && !isUnknown;
  }

  private static boolean hasJSDocAnnotation(FunctionTree funcDec) {
    for (Trivia trivia : ((JavaScriptTree) funcDec).getToken().getTrivia()) {
      if (trivia.toString().contains("@constructor") || trivia.toString().contains("@class")) {
        return true;
      }
    }
    return false;
  }

}
