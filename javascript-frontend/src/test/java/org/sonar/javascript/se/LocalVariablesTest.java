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
package org.sonar.javascript.se;

import com.sonar.sslr.api.typed.ActionParser;
import java.util.List;
import java.util.Set;
import org.junit.Test;
import org.sonar.javascript.cfg.ControlFlowGraph;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.javascript.visitors.JavaScriptVisitorContext;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;

import static org.assertj.core.api.Assertions.assertThat;

public class LocalVariablesTest {

  private ActionParser<Tree> parser = JavaScriptParserBuilder.createParser();

  @Test
  public void empty() throws Exception {
    LocalVariables localVariables = localVariables("function f() { }");
    assertThat(localVariables.functionParameters()).isEmpty();
    assertThat(localVariables.trackableVariables()).isEmpty();
  }

  @Test
  public void parameter() throws Exception {
    LocalVariables localVariables = localVariables("function f(p) { foo(p); }");
    assertSingleSymbol(localVariables.functionParameters(), "p");
    assertSingleSymbol(localVariables.trackableVariables(), "p");
  }

  @Test
  public void non_parameter() throws Exception {
    LocalVariables localVariables = localVariables("function f() { var x; }");
    assertThat(localVariables.functionParameters()).isEmpty();
    assertSingleSymbol(localVariables.trackableVariables(), "x");
  }

  @Test
  public void global_var() throws Exception {
    LocalVariables localVariables = localVariables("function f() { return x; }");
    assertThat(localVariables.functionParameters()).isEmpty();
    assertThat(localVariables.trackableVariables()).isEmpty();
  }

  @Test
  public void local_var_read_outside_cfg() throws Exception {
    LocalVariables localVariables = localVariables("function f() { var x; function getX() { return x; } }");
    assertSingleSymbol(localVariables.trackableVariables(), "x");
  }

  @Test
  public void local_var_written_outside_cfg() throws Exception {
    LocalVariables localVariables = localVariables("function f() { var x; function setX(p) { x = p; } }");
    assertThat(localVariables.trackableVariables()).isEmpty();
  }

  @Test
  public void local_var_written_inside_cfg() throws Exception {
    LocalVariables localVariables = localVariables("function f() { var x; x = 42; }");
    assertSingleSymbol(localVariables.trackableVariables(), "x");
  }

  @Test
  public void var_defined_in_outer_function() throws Exception {
    ScriptTree script = parse("function f() { var x; function g() { return x; } }");
    FunctionDeclarationTree f = firstFunctionDeclaration(script.items().items());
    FunctionDeclarationTree g = firstFunctionDeclaration(f.body().statements());
    assertThat(localVariables(script, g).trackableVariables()).isEmpty();
  }

  private LocalVariables localVariables(String functionSource) {
    ScriptTree script = parse(functionSource);
    FunctionDeclarationTree function = firstFunctionDeclaration(script.items().items());
    return localVariables(script, function);
  }

  private LocalVariables localVariables(ScriptTree script, FunctionDeclarationTree function) {
    Scope scope = new JavaScriptVisitorContext(script, null, null).getSymbolModel().getScope(function);
    ControlFlowGraph cfg = ControlFlowGraph.build(function.body());
    return new LocalVariables(scope, cfg);
  }

  private FunctionDeclarationTree firstFunctionDeclaration(List<? extends Tree> trees) {
    for (Tree tree : trees) {
      if (tree.is(Kind.FUNCTION_DECLARATION)) {
        return (FunctionDeclarationTree) tree;
      }
    }
    throw new IllegalArgumentException("No function declaration was found");
  }

  private ScriptTree parse(String source) {
    return (ScriptTree) parser.parse(source);
  }

  private void assertSingleSymbol(Set<Symbol> symbols, String expectedName) {
    assertThat(symbols).hasSize(1);
    assertThat(symbols.iterator().next().name()).isEqualTo(expectedName);
  }

}
