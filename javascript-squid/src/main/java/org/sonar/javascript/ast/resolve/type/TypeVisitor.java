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

import com.google.common.base.Preconditions;
import org.sonar.api.config.Settings;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.javascript.model.internal.SeparatedList;
import org.sonar.javascript.model.internal.expression.ArrayLiteralTreeImpl;
import org.sonar.javascript.model.internal.expression.CallExpressionTreeImpl;
import org.sonar.javascript.model.internal.expression.IdentifierTreeImpl;
import org.sonar.javascript.model.internal.expression.LiteralTreeImpl;
import org.sonar.javascript.model.internal.expression.ObjectLiteralTreeImpl;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrayLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectLiteralTree;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;

import javax.annotation.Nullable;
import java.util.Set;

public class TypeVisitor extends BaseTreeVisitor {

  private JQuery jQueryHelper;

  public TypeVisitor(@Nullable Settings settings){
    if (settings == null){
      jQueryHelper = new JQuery(JQuery.JQUERY_OBJECT_ALIASES_DEFAULT_VALUE.split(", "));
    } else {
      jQueryHelper = new JQuery(settings.getStringArray(JQuery.JQUERY_OBJECT_ALIASES));
    }
  }

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
      ((LiteralTreeImpl) tree).addType(PrimitiveType.NUMBER);

    } else if (tree.is(Tree.Kind.STRING_LITERAL)) {
      ((LiteralTreeImpl) tree).addType(PrimitiveType.STRING);

    } else if (tree.is(Tree.Kind.BOOLEAN_LITERAL)) {
      ((LiteralTreeImpl) tree).addType(PrimitiveType.BOOLEAN);
    }
    super.visitLiteral(tree);
  }

  @Override
  public void visitArrayLiteral(ArrayLiteralTree tree) {
    ((ArrayLiteralTreeImpl) tree).addType(PrimitiveType.ARRAY);
    super.visitArrayLiteral(tree);
  }

  @Override
  public void visitObjectLiteral(ObjectLiteralTree tree) {
    ((ObjectLiteralTreeImpl) tree).addType(ObjectType.create());
    super.visitObjectLiteral(tree);
  }

  @Override
  public void visitFunctionDeclaration(FunctionDeclarationTree tree) {
    Preconditions.checkState(tree.name().symbol() != null,
        String.format("Symbol has not been created for this function %s declared at line %s", tree.name().name(), ((JavaScriptTree) tree).getLine()));

    tree.name().symbol().addType(FunctionType.create(tree));

    super.visitFunctionDeclaration(tree);
  }

  @Override
  public void visitCallExpression(CallExpressionTree tree) {
    super.visitCallExpression(tree);

    if (jQueryHelper.isJQuerySelectorObject(tree)) {
      ((CallExpressionTreeImpl) tree).addType(PrimitiveType.JQUERY_SELECTOR_OBJECT);
    }

    FunctionType functionType = getFunctionType(tree.callee().types());
    if (functionType != null) {

      SeparatedList<Tree> parameters = functionType.functionTree().parameters().parameters();
      SeparatedList<Tree> arguments = tree.arguments().parameters();
      int minSize = arguments.size() < parameters.size() ? arguments.size() : parameters.size();

      for (int i = 0; i < minSize; i++) {
        Preconditions.checkState(arguments.get(i) instanceof ExpressionTree);
        Tree currentParameter = parameters.get(i);
        if (currentParameter instanceof IdentifierTree) {
          Symbol symbol = ((IdentifierTree) currentParameter).symbol();
          if (symbol != null) {
            addTypes(symbol, ((ExpressionTree) arguments.get(i)).types());
          } else {
            throw new IllegalStateException(String.format(
                "Parameter %s has no symbol associated with it (line %s)",
                ((IdentifierTree) currentParameter).name(),
                ((JavaScriptTree) currentParameter).getLine()
            ));
          }
        }
      }
    }
  }

  @Override
  public void visitIdentifier(IdentifierTree tree) {
    if (jQueryHelper.isJQueryObject(tree)){
      ((IdentifierTreeImpl)tree).addType(PrimitiveType.JQUERY_OBJECT);
    }
  }

  /**
   * @param types
   * @return element of types which is FunctionType. Returns null if there are more than one.
   */
  @Nullable
  private FunctionType getFunctionType(Set<Type> types) {
    FunctionType functionType = null;
    for (Type type : types) {
      if (type.kind() == Type.Kind.FUNCTION) {
        if (functionType == null) {
          functionType = (FunctionType) type;
        } else {
          return null;
        }
      }
    }
    return functionType;
  }

  private void inferType(Tree identifier, ExpressionTree assignedTree) {
    super.scan(assignedTree);

    if (identifier instanceof IdentifierTree) {
      Symbol symbol = ((IdentifierTree) identifier).symbol();

      if (symbol != null) {
        addTypes(symbol, assignedTree.types());
      }
    }
  }

  private void addTypes(Symbol symbol, Set<Type> types) {
    if (types.isEmpty()){
      symbol.addType(PrimitiveType.UNKNOWN);
    } else {
      symbol.addTypes(types);
    }
  }

}
