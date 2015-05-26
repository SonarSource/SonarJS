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

import com.sonar.sslr.api.AstNode;
import org.junit.Before;
import org.junit.Test;
import org.sonar.javascript.model.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.statement.ExpressionStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.tree.statement.VariableStatementTree;

import java.io.File;
import java.util.List;

import static org.fest.assertions.Assertions.assertThat;

public class LinkToSymbolFromTreeTest extends JavaScriptTreeModelTest {

  private List<Tree> MODULE_ITEMS;

  @Before
  public void setUp() throws Exception {
    AstNode ROOT_NODE = p.parse(new File("src/test/resources/ast/resolve/symbols.js"));
    SymbolModelImpl.create((ScriptTree) ROOT_NODE, null, null, null);
    MODULE_ITEMS = ((ScriptTree) ROOT_NODE).items().items();
  }

  @Test
  public void variable() {
    Symbol symbolX = ((IdentifierTree) ((VariableStatementTree) MODULE_ITEMS.get(0)).declaration().variables().get(0)).symbol();
    assertThat(symbolX).isNotNull();
    assertThat(symbolX.name()).isEqualTo("x");

    BindingElementTree bindingElementTree = ((VariableStatementTree) MODULE_ITEMS.get(1)).declaration().variables().get(0);
    Symbol symbolY = ((IdentifierTree)((InitializedBindingElementTree) bindingElementTree).left()).symbol();
    assertThat(symbolY).isNotNull();
    assertThat(symbolY.name()).isEqualTo("y");


    IdentifierTree variableX = (IdentifierTree) ((AssignmentExpressionTree)((ExpressionStatementTree) MODULE_ITEMS.get(2)).expression()).variable();
    assertThat(variableX.symbol()).isEqualTo(symbolX);
  }

  @Test
  public void built_ins(){
    List<StatementTree> statements = ((FunctionDeclarationTree) MODULE_ITEMS.get(3)).body().statements();
    IdentifierTree eval = (IdentifierTree) ((CallExpressionTree)((ExpressionStatementTree) statements.get(1)).expression()).callee();
    assertThat(eval.symbol()).isNotNull();
    assertThat(eval.symbol().builtIn()).isTrue();

    IdentifierTree arguments = ((IdentifierTree) ((InitializedBindingElementTree) ((VariableStatementTree) statements.get(0)).declaration().variables().get(0)).right());
    assertThat(arguments.symbol()).isNotNull();
    assertThat(arguments.symbol().builtIn()).isTrue();
  }

  @Test
  public void function() throws Exception {
    FunctionDeclarationTree function = ((FunctionDeclarationTree) MODULE_ITEMS.get(3));
    IdentifierTree fooDeclaration = function.name();
    assertThat(fooDeclaration.symbol()).isNotNull();
    assertThat(fooDeclaration.symbol().is(Symbol.Kind.FUNCTION)).isTrue();

    IdentifierTree parameterDeclaration = (IdentifierTree) function.parameters().parameters().get(0);
    assertThat(parameterDeclaration.symbol()).isNotNull();
    assertThat(parameterDeclaration.symbol()).isNotNull();
    assertThat(parameterDeclaration.symbol().is(Symbol.Kind.PARAMETER)).isTrue();
    assertThat(parameterDeclaration.symbol().name()).isEqualTo("p");
  }
}
