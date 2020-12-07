/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
 * mailto:info AT sonarsource DOT com
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
import java.util.List;
import java.util.Optional;
import javax.annotation.Nullable;
import org.sonar.api.config.Configuration;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.declaration.ClassTreeImpl;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.javascript.tree.symbols.type.ObjectType.BuiltInObjectType;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.symbols.Type.Callability;
import org.sonar.plugins.javascript.api.symbols.Type.Kind;
import org.sonar.plugins.javascript.api.symbols.TypeSet;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.ClassTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrayLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.MemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.NewExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.ParenthesisedExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.ForObjectStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class TypeVisitor extends DoubleDispatchVisitor {

  private JQuery jQueryHelper;
  private boolean forLoopVariable = false;

  public TypeVisitor(@Nullable Configuration configuration) {
    if (configuration == null) {
      jQueryHelper = new JQuery(JQuery.JQUERY_OBJECT_ALIASES_DEFAULT_VALUE.split(", "));
    } else {
      jQueryHelper = new JQuery(configuration.getStringArray(JQuery.JQUERY_OBJECT_ALIASES));
    }
  }

  @Override
  public void visitAssignmentExpression(AssignmentExpressionTree tree) {
    inferType(tree.variable(), tree.expression());
    scan(tree.variable());
  }

  @Override
  public void visitInitializedBindingElement(InitializedBindingElementTree tree) {
    // we don't infer type from default parameter value
    if (tree.parent().is(Tree.Kind.PARAMETER_LIST)) {
      return;
    }

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
    IdentifierTree name = tree.name();
    String nameName = name.name();

    Preconditions.checkState(name.symbol().isPresent(),
      "Symbol has not been created for this function %s declared at line %s",
      nameName,
      tree.firstToken().line());

    name.symbol().get().addType(FunctionType.create(tree));
    super.visitFunctionDeclaration(tree);
  }

  @Override
  public void visitFunctionExpression(FunctionExpressionTree tree) {
    if (tree.name() != null) {
      addTypes(tree.name().symbol().get(), tree.types());
    }
    super.visitFunctionExpression(tree);
  }

  @Override
  public void visitClass(ClassTree tree) {
    ClassType classType = ((ClassTreeImpl) tree).classType();
    if (tree.name() != null) {
      tree.name().symbol().get().addType(classType);
    }

    for (Tree element : tree.elements()) {
      Tree name;
      if (element.is(Tree.Kind.METHOD, Tree.Kind.GENERATOR_METHOD)) {
        name = ((MethodDeclarationTree) element).name();

      } else {
        continue;
      }

      if (name.is(Tree.Kind.PROPERTY_IDENTIFIER)) {
        // classScope is never null, ScopeVisitor#visitClass guarantees that
        Scope classScope = getContext().getSymbolModel().getScope(tree);
        classType.addMethod((IdentifierTree) name, FunctionType.create((FunctionTree) element), classScope);
      }
    }

    super.visitClass(tree);
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

    } else if (AngularJS.isModule(tree)) {
      addType(tree, ObjectType.FrameworkType.ANGULAR_MODULE);
    }

    inferParameterType(tree);
  }

  private static void addType(ExpressionTree tree, Type type) {
    ((TypableTree) tree).add(type);
  }

  private static void inferParameterType(CallExpressionTree tree) {
    Type functionType = tree.callee().types().getUniqueType(Type.Kind.FUNCTION);
    if (functionType != null) {

      List<BindingElementTree> parameters = ((FunctionType) functionType).functionTree().parameterList();
      List<ExpressionTree> arguments = tree.argumentClause().arguments();
      int minSize = arguments.size() < parameters.size() ? arguments.size() : parameters.size();

      for (int i = 0; i < minSize; i++) {
        Tree currentParameter = parameters.get(i);
        inferParameterType(currentParameter, arguments, i);
      }
    }
  }

  private static void inferParameterType(Tree currentParameter, List<ExpressionTree> arguments, int index) {
    if (currentParameter.is(Tree.Kind.BINDING_IDENTIFIER)) {
      Optional<Symbol> symbol = ((IdentifierTree) currentParameter).symbol();
      if (symbol.isPresent()) {
        addTypes(symbol.get(), arguments.get(index).types());
      } else {
        throw new IllegalStateException(String.format(
          "Parameter %s has no symbol associated with it (line %s)",
          ((IdentifierTree) currentParameter).name(),
          currentParameter.firstToken().line()
        ));
      }
    }
  }

  @Override
  public void visitNewExpression(NewExpressionTree tree) {
    super.visitNewExpression(tree);

    TypeSet types = tree.expression().types();

    if (types.contains(Kind.CLASS)) {
      Type classType = types.getUniqueType(Kind.CLASS);
      if (classType != null) {
        addType(tree, ((ClassType) classType).createObject());
      }

    } else if (types.contains(Type.Kind.BACKBONE_MODEL)) {
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

    } else {
      resolveObjectPropertyAccess(tree);
    }
  }

  private static void resolveObjectPropertyAccess(MemberExpressionTree tree) {
    ObjectType objectType = (ObjectType) tree.object().types().getUniqueType(Kind.OBJECT);
    if (objectType != null && tree.property().is(Tree.Kind.PROPERTY_IDENTIFIER)) {
      String property = ((IdentifierTree) tree.property()).name();
      Symbol propertySymbol = objectType.property(property);
      if (propertySymbol != null) {
        addTypes(tree, propertySymbol.types());
        // fixme might be write usage
        propertySymbol.addUsage((IdentifierTree) tree.property(), Usage.Kind.READ);
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
  public void visitUnaryExpression(UnaryExpressionTree tree) {
    super.visitUnaryExpression(tree);

    Type resultType = PrimitiveOperations.getType(tree);
    if (resultType != null) {
      addType(tree, resultType);
    }
  }

  @Override
  public void visitForObjectStatement(ForObjectStatementTree tree) {
    scan(tree.expression());

    this.forLoopVariable = true;
    scan(tree.variableOrExpression());
    this.forLoopVariable = false;

    scan(tree.statement());
  }

  private void inferType(Tree identifier, ExpressionTree assignedTree) {
    super.scan(assignedTree);

    if (identifier instanceof IdentifierTree) {
      Optional<Symbol> symbol = ((IdentifierTree) identifier).symbol();

      if (symbol.isPresent()) {
        addTypes(symbol.get(), assignedTree.types());
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
