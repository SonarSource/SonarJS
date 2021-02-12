/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
package org.sonar.javascript.tree.symbols;

import java.util.List;
import org.junit.Before;
import org.junit.Test;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.javascript.utils.TestUtils;
import org.sonar.javascript.visitors.JavaScriptVisitorContext;
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

import static org.assertj.core.api.Assertions.assertThat;

public class LinkToSymbolFromTreeTest extends JavaScriptTreeModelTest {

  private List<Tree> MODULE_ITEMS;

  @Before
  public void setUp() throws Exception {
    InputFile file = TestUtils.createTestInputFile("src/test/resources/ast/resolve/symbols.js");
    ScriptTree ROOT_NODE = (ScriptTree) p.parse(file.contents());
    new JavaScriptVisitorContext(ROOT_NODE, file, null);
    MODULE_ITEMS = (ROOT_NODE).items().items();
  }

  @Test
  public void variable() {
    Symbol symbolX = ((IdentifierTree) ((VariableStatementTree) MODULE_ITEMS.get(0)).declaration().variables().get(0)).symbol().get();
    assertThat(symbolX).isNotNull();
    assertThat(symbolX.name()).isEqualTo("x");

    BindingElementTree bindingElementTree = ((VariableStatementTree) MODULE_ITEMS.get(1)).declaration().variables().get(0);
    Symbol symbolY = ((IdentifierTree) ((InitializedBindingElementTree) bindingElementTree).left()).symbol().get();
    assertThat(symbolY.name()).isEqualTo("y");


    IdentifierTree variableX = (IdentifierTree) ((AssignmentExpressionTree) ((ExpressionStatementTree) MODULE_ITEMS.get(2)).expression()).variable();
    assertThat(variableX.symbol().get()).isEqualTo(symbolX);
  }

  @Test
  public void built_ins() {
    List<StatementTree> statements = ((FunctionDeclarationTree) MODULE_ITEMS.get(3)).body().statements();
    IdentifierTree eval = (IdentifierTree) ((CallExpressionTree) ((ExpressionStatementTree) statements.get(1)).expression()).callee();
    assertThat(eval.symbol()).isPresent();
    assertThat(eval.symbol().get().external()).isTrue();

    IdentifierTree arguments = ((IdentifierTree) ((InitializedBindingElementTree) ((VariableStatementTree) statements.get(0)).declaration().variables().get(0)).right());
    assertThat(arguments.symbol()).isPresent();
    assertThat(arguments.symbol().get().external()).isTrue();
  }

  @Test
  public void function() throws Exception {
    FunctionDeclarationTree function = ((FunctionDeclarationTree) MODULE_ITEMS.get(3));
    IdentifierTree fooDeclaration = function.name();
    assertThat(fooDeclaration.symbol()).isPresent();
    assertThat(fooDeclaration.symbol().get().is(Symbol.Kind.FUNCTION)).isTrue();

    IdentifierTree parameterDeclaration = (IdentifierTree) function.parameterClause().parameters().get(0);
    assertThat(parameterDeclaration.symbol()).isPresent();
    assertThat(parameterDeclaration.symbol().get().is(Symbol.Kind.PARAMETER)).isTrue();
    assertThat(parameterDeclaration.symbol().get().name()).isEqualTo("p");
  }
}
