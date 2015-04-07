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
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.FunctionDeclarationTree;
import org.sonar.javascript.model.interfaces.declaration.ScriptTree;
import org.sonar.javascript.model.interfaces.expression.FunctionExpressionTree;
import org.sonar.javascript.model.interfaces.statement.CatchBlockTree;

import java.io.File;
import java.util.Collection;
import java.util.Iterator;

import static org.fest.assertions.Assertions.assertThat;

public class UsageTest extends JavaScriptTreeModelTest {

  private AstNode ROOT_NODE;
  private SymbolModel SYMBOL_MODEL;

  @Before
  public void setUp() throws Exception {
    ROOT_NODE = p.parse(new File("src/test/resources/ast/resolve/usage.js"));
    SYMBOL_MODEL = SymbolModel.createFor((ScriptTree) ROOT_NODE);
  }

  @Test
  public void global_symbols() throws Exception {
    Scope scriptScope = SYMBOL_MODEL.getScopeFor((ScriptTree) ROOT_NODE);
    assertThat(usagesFor("a", scriptScope)).hasSize(3);
    assertThat(usagesFor("b", scriptScope)).hasSize(2);
    assertThat(usagesFor("f", scriptScope)).hasSize(2);

  }

  @Test
  public void global_build_in_symbols() throws Exception {
    Scope scriptScope = SYMBOL_MODEL.getScopeFor((ScriptTree) ROOT_NODE);
    assertThat(usagesFor("eval", scriptScope)).hasSize(2);
  }

  @Test
  public void arguments_build_in_symbol() throws Exception {
    Scope scriptScope = SYMBOL_MODEL.getScopeFor((ScriptTree) ROOT_NODE);
    assertThat(scriptScope.lookupSymbol("arguments").buildIn()).isFalse();
    Scope functionScope = SYMBOL_MODEL.getScopeFor((FunctionDeclarationTree) ROOT_NODE.getFirstDescendant(Tree.Kind.FUNCTION_DECLARATION));
    assertThat(functionScope.lookupSymbol("arguments").buildIn()).isTrue();
  }

  @Test
  public void function_symbols() throws Exception {
    Scope functionScope = SYMBOL_MODEL.getScopeFor((FunctionDeclarationTree) ROOT_NODE.getFirstDescendant(Tree.Kind.FUNCTION_DECLARATION));
    assertThat(usagesFor("p1", functionScope)).hasSize(1);
    assertThat(usagesFor("p2", functionScope)).isEmpty();
    assertThat(usagesFor("b", functionScope)).hasSize(3);
  }

  @Test
  public void function_expression_symbols() throws Exception {
    Scope functionExprScope = SYMBOL_MODEL.getScopeFor((FunctionExpressionTree) ROOT_NODE.getFirstDescendant(Tree.Kind.FUNCTION_EXPRESSION));
    assertThat(usagesFor("g", functionExprScope)).hasSize(1);
  }

  @Test
  public void catch_block_symbols() throws Exception {
    Scope catchScope = SYMBOL_MODEL.getScopeFor((CatchBlockTree) ROOT_NODE.getFirstDescendant(Tree.Kind.CATCH_BLOCK));
    assertThat(usagesFor("e", catchScope)).hasSize(1);
  }

  @Test
  public void usage_type() throws Exception {
    Scope scriptScope = SYMBOL_MODEL.getScopeFor((ScriptTree) ROOT_NODE);
    Collection<Usage> usages = usagesFor("var1", scriptScope);
    assertThat(usages).hasSize(4);
    Iterator<Usage> iterator = usages.iterator();
    int readCounter = 0;
    int writeCounter = 0;
    while (iterator.hasNext()){
      Usage next = iterator.next();
      readCounter += !next.kind().equals(Usage.Kind.WRITE) ? 1 : 0;
      writeCounter += !next.kind().equals(Usage.Kind.READ) ? 1 : 0;
    }
    assertThat(readCounter).isEqualTo(2);
    assertThat(writeCounter).isEqualTo(3);
  }

  public Collection<Usage> usagesFor(String name, Scope scope) {
    return SYMBOL_MODEL.getUsageFor(scope.lookupSymbol(name));
  }

}
