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
package org.sonar.javascript.ast.resolve;

import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrayLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectLiteralTree;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;

public class TypeVisitor extends BaseTreeVisitor {

  private Symbol currentSymbol = null;

  @Override
  public void visitAssignmentExpression(AssignmentExpressionTree tree) {
    if (tree.variable() instanceof IdentifierTree) {
      currentSymbol = ((IdentifierTree) tree.variable()).symbol();
    }
    super.visitAssignmentExpression(tree);
    currentSymbol = null;
  }

  @Override
  public void visitInitializedBindingElement(InitializedBindingElementTree tree) {
    if (tree.left() instanceof IdentifierTree) {
      currentSymbol = ((IdentifierTree) tree.left()).symbol();
    }
    super.visitInitializedBindingElement(tree);
    currentSymbol = null;
  }

  @Override
  public void visitLiteral(LiteralTree tree) {
    if (tree.is(Tree.Kind.NUMERIC_LITERAL)) {
      addType(Type.NUMBER);

    } else if (tree.is(Tree.Kind.STRING_LITERAL)) {
      addType(Type.STRING);

    } else if (tree.is(Tree.Kind.BOOLEAN_LITERAL)) {
      addType(Type.BOOLEAN);
    }
  }

  @Override
  public void visitArrayLiteral(ArrayLiteralTree tree) {
    addType(Type.ARRAY);
    // don't visit the sub-tree
  }

  @Override
  public void visitObjectLiteral(ObjectLiteralTree tree) {
    addType(Type.OBJECT);
    // don't visit the sub-tree
  }

  private void addType(Type type) {
    if (currentSymbol != null) {
      currentSymbol.addType(type);
    }
  }

}
