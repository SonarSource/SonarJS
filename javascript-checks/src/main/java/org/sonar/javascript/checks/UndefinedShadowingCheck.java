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

import java.util.List;

import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.ast.visitors.AstTreeVisitorContext;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.checks.utils.SubscriptionBaseVisitor;
import org.sonar.javascript.model.implementations.statement.VariableDeclarationTreeImpl;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.squidbridge.annotations.Tags;

import com.google.common.collect.ImmutableList;

@Rule(
  key = "S2137",
  priority = Priority.CRITICAL,
  tags = {Tags.PITFALL})
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.CRITICAL)
public class UndefinedShadowingCheck extends SubscriptionBaseVisitor {

  private int scopeLevel = 0;

  @Override
  public void scanFile(AstTreeVisitorContext context) {
    scopeLevel = 0;
    super.scanFile(context);
  }

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.<Kind>builder()
      .addAll(CheckUtils.FUNCTION_NODES)
      .add(Kind.VAR_DECLARATION)
      .build();
  }

  @Override
  public void visitNode(Tree tree) {
    if (tree.is(CheckUtils.functionNodesArray())) {
      scopeLevel++;

    } else if (scopeLevel > 0 /* in local scope */) {

      for (IdentifierTree identifier : ((VariableDeclarationTreeImpl) tree).variableIdentifiers()) {
        if ("undefined".equals(identifier.name())) {
          addIssue(identifier, "Rename this variable.");
        }
      }
    }
  }

  @Override
  public void leaveNode(Tree tree) {
    if (tree.is(CheckUtils.functionNodesArray())) {
      scopeLevel--;
    }
  }
}
