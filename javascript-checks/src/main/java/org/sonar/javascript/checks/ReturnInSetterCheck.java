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

import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.ast.visitors.BaseTreeVisitor;
import org.sonar.javascript.ast.visitors.TreeVisitor;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.MethodDeclarationTree;
import org.sonar.javascript.model.interfaces.statement.ReturnStatementTree;

@Rule(
  key = "S2432",
  tags = {"bug"},
  priority = Priority.CRITICAL)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.CRITICAL)
public class ReturnInSetterCheck extends BaseTreeVisitor {

  private final TreeVisitor forbiddenReturnVisitor = new ForbiddenReturnVisitor();

  @Override
  public void visitMethodDeclaration(MethodDeclarationTree tree) {
    if (tree.is(Tree.Kind.SET_METHOD)) {
      tree.body().accept(forbiddenReturnVisitor);
    }
    super.visitMethodDeclaration(tree);
  }

  private class ForbiddenReturnVisitor extends BaseTreeVisitor {

    @Override
    public void visitReturnStatement(ReturnStatementTree tree) {
      if (tree.expression() != null) {
        ReturnInSetterCheck check = ReturnInSetterCheck.this;
        check.getContext().addIssue(check, tree, "Remove this return statement.");
      }
      super.visitReturnStatement(tree);
    }

  }

}
