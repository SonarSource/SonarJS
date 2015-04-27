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
import org.sonar.javascript.api.SymbolModel;
import org.sonar.javascript.ast.resolve.TypeInferring;
import org.sonar.javascript.ast.visitors.BaseTreeVisitor;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.expression.MemberExpressionTree;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
    key = "S2787",
    name = "Proprietary attributes should not be used",
    priority = Priority.CRITICAL,
    tags = {Tags.CROSS_BROWSER, Tags.LOCK_IN})
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.SOFTWARE_RELATED_PORTABILITY)
@SqaleConstantRemediation("5min")
public class ProprietaryAttributesCheck extends BaseTreeVisitor {

  private static final String MESSAGE = "Remove this use of \"innerText\".";

  @Override
  public void visitMemberExpression(MemberExpressionTree tree) {
    ExpressionTree object = tree.object();
    ExpressionTree property = tree.property();
    if (property.is(Tree.Kind.IDENTIFIER_NAME) && "innerText".equals(CheckUtils.asString(property))){
      if (TypeInferring.isHTMLElement(object)) {
        getContext().addIssue(this, tree, MESSAGE);
      }
      if (object.is(Tree.Kind.IDENTIFIER_REFERENCE)){
        SymbolModel symbolModel = getContext().getSymbolModel();
      }
    }
    super.visitMemberExpression(tree);
  }

}
