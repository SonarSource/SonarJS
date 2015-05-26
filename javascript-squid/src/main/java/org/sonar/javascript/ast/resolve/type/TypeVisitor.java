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
package org.sonar.javascript.ast.resolve.type;

import org.sonar.javascript.ast.resolve.Symbol;
import org.sonar.javascript.model.internal.expression.ArrayLiteralTreeImpl;
import org.sonar.javascript.model.internal.expression.LiteralTreeImpl;
import org.sonar.javascript.model.internal.expression.ObjectLiteralTreeImpl;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrayLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectLiteralTree;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;

public class TypeVisitor extends BaseTreeVisitor {

  @Override
  public void visitAssignmentExpression(AssignmentExpressionTree tree) {
    inferType(tree.variable(), tree.expression());
    scan(tree.variable());
  }

  @Override
  public void visitInitializedBindingElement(InitializedBindingElementTree tree) {
    inferType(tree.left(), tree.right());
    scan(tree.left());
  }

  @Override
  public void visitLiteral(LiteralTree tree) {
    if (tree.is(Tree.Kind.NUMERIC_LITERAL)) {
      ((LiteralTreeImpl) tree).addType(Type.NUMBER);

    } else if (tree.is(Tree.Kind.STRING_LITERAL)) {
      ((LiteralTreeImpl) tree).addType(Type.STRING);

    } else if (tree.is(Tree.Kind.BOOLEAN_LITERAL)) {
      ((LiteralTreeImpl) tree).addType(Type.BOOLEAN);
    }
    super.visitLiteral(tree);
  }

  @Override
  public void visitArrayLiteral(ArrayLiteralTree tree) {
    ((ArrayLiteralTreeImpl) tree).addType(Type.ARRAY);
    super.visitArrayLiteral(tree);
  }

  @Override
  public void visitObjectLiteral(ObjectLiteralTree tree) {
    ((ObjectLiteralTreeImpl) tree).addType(Type.OBJECT);
    super.visitObjectLiteral(tree);
  }

  protected void inferType(Tree identifier, ExpressionTree assignedTree) {
    super.scan(assignedTree);

    if (identifier instanceof IdentifierTree) {
      Symbol symbol = ((IdentifierTree) identifier).symbol();

      if (symbol != null) {
        symbol.addTypes(assignedTree.types());
      }
    }
  }

}
