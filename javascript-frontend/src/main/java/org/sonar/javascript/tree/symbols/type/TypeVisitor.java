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
package org.sonar.javascript.tree.symbols.type;

import com.google.common.base.Preconditions;
import javax.annotation.Nullable;
import org.sonar.api.config.Settings;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.SeparatedList;
import org.sonar.javascript.tree.symbols.type.ObjectType.BuiltInObjectType;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.symbols.Type.Callability;
import org.sonar.plugins.javascript.api.symbols.TypeSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrayLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.MemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.NewExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.ParenthesisedExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.ForInStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForOfStatementTree;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;

public class TypeVisitor extends BaseTreeVisitor {

  private JQuery jQueryHelper;
  private boolean forLoopVariable = false;

  public TypeVisitor(@Nullable Settings settings) {
    if (settings == null) {
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
      addType(tree, PrimitiveType.NUMBER);

    } else if (tree.is(Tree.Kind.STRING_LITERAL)) {
      addType(tree, PrimitiveType.STRING);

    } else if (tree.is(Tree.Kind.BOOLEAN_LITERAL)) {
      addType(tree, PrimitiveType.BOOLEAN);
    }
  }

  @Override
  public void visitArrayLiteral(ArrayLiteralTree tree) {
    super.visitArrayLiteral(tree);
    addType(tree, ArrayType.create());
  }

  @Override
  public void visitObjectLiteral(ObjectLiteralTree tree) {
    super.visitObjectLiteral(tree);
    addType(tree, ObjectType.create(Callability.NON_CALLABLE));
  }

  @Override
  public void visitFunctionDeclaration(FunctionDeclarationTree tree) {
    Preconditions.checkState(tree.name().symbol() != null,
      String.format("Symbol has not been created for this function %s declared at line %s", tree.name().name(), ((JavaScriptTree) tree).getLine()));

    super.visitFunctionDeclaration(tree);
    tree.name().symbol().addType(FunctionType.create(tree));
  }

  @Override
  public void visitCallExpression(CallExpressionTree tree) {
    super.visitCallExpression(tree);

    Type type = BuiltInMethods.inferType(tree);

    if (type != null) {
      addType(tree, type);

    } else if (jQueryHelper.isSelectorObject(tree)) {
      addType(tree, ObjectType.FrameworkType.JQUERY_SELECTOR_OBJECT);

    } else if (Backbone.isModel(tree)) {
      addType(tree, ObjectType.FrameworkType.BACKBONE_MODEL);

    } else if (WebAPI.isWindow(tree)) {
      addType(tree, ObjectType.WebApiType.WINDOW);

    } else if (WebAPI.isElement(tree)) {
      addType(tree, ObjectType.WebApiType.DOM_ELEMENT);

    } else if (WebAPI.isElementList(tree)) {
      addType(tree, ArrayType.create(ObjectType.WebApiType.DOM_ELEMENT));
    }

    inferParameterType(tree);
  }

  private static void addType(ExpressionTree tree, Type type) {
    ((TypableTree) tree).add(type);
  }

  private static void inferParameterType(CallExpressionTree tree) {
    Type functionType = tree.callee().types().getUniqueType(Type.Kind.FUNCTION);
    if (functionType != null) {

      SeparatedList<Tree> parameters = ((FunctionType) functionType).functionTree().parameters().parameters();
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
  public void visitNewExpression(NewExpressionTree tree) {
    super.visitNewExpression(tree);

    if (tree.expression().types().contains(Type.Kind.BACKBONE_MODEL)) {
      addType(tree, ObjectType.FrameworkType.BACKBONE_MODEL_OBJECT);

    } else if (Utils.identifierWithName(tree.expression(), "String")) {
      addType(tree, PrimitiveType.STRING);

    } else if (Utils.identifierWithName(tree.expression(), "Number")) {
      addType(tree, PrimitiveType.NUMBER);

    } else if (Utils.identifierWithName(tree.expression(), "Boolean")) {
      addType(tree, PrimitiveType.BOOLEAN);

    } else if (Utils.identifierWithName(tree.expression(), "Date")) {
      addType(tree, BuiltInObjectType.DATE);

    } else {
      addType(tree, ObjectType.create());
    }

  }

  @Override
  public void visitIdentifier(IdentifierTree tree) {
    if (jQueryHelper.isJQueryObject(tree)) {
      addType(tree, ObjectType.FrameworkType.JQUERY_OBJECT);
    }

    if (WebAPI.isDocument(tree)) {
      addType(tree, ObjectType.WebApiType.DOCUMENT);
    }

    if (forLoopVariable) {
      addType(tree, PrimitiveType.UNKNOWN);
    }
  }

  @Override
  public void visitParenthesisedExpression(ParenthesisedExpressionTree tree) {
    super.visitParenthesisedExpression(tree);
    addTypes(tree, tree.expression().types());
  }

  @Override
  public void visitMemberExpression(MemberExpressionTree tree) {
    super.visitMemberExpression(tree);

    if (WebAPI.isWindow(tree)) {
      addType(tree, ObjectType.WebApiType.WINDOW);
    }

    if (WebAPI.isElement(tree)) {
      addType(tree, ObjectType.WebApiType.DOM_ELEMENT);
    }

    if (tree.is(Tree.Kind.BRACKET_MEMBER_EXPRESSION)) {
      Type arrayType = tree.object().types().getUniqueType(Type.Kind.ARRAY);
      if (arrayType != null && ((ArrayType) arrayType).elementType() != null) {
        addType(tree, ((ArrayType) arrayType).elementType());
      }
    }
  }

  @Override
  public void visitBinaryExpression(BinaryExpressionTree tree) {
    super.visitBinaryExpression(tree);

    Type resultType = PrimitiveOperations.getType(
      tree.leftOperand(),
      tree.rightOperand(),
      ((JavaScriptTree) tree).getKind()
    );

    if (resultType != null) {
      addType(tree, resultType);
    }
  }

  @Override
  public void visitForInStatement(ForInStatementTree tree) {
    scan(tree.expression());

    this.forLoopVariable = true;
    scan(tree.variableOrExpression());
    this.forLoopVariable = false;

    scan(tree.statement());
  }

  @Override
  public void visitForOfStatement(ForOfStatementTree tree) {
    scan(tree.expression());

    this.forLoopVariable = true;
    scan(tree.variableOrExpression());
    this.forLoopVariable = false;

    scan(tree.statement());
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

  private static void addTypes(Symbol symbol, TypeSet types) {
    if (types.isEmpty()) {
      symbol.addType(PrimitiveType.UNKNOWN);
    } else {
      symbol.addTypes(types);
    }
  }

  private static void addTypes(ExpressionTree tree, TypeSet types) {
    for (Type type : types) {
      addType(tree, type);
    }
  }

}
