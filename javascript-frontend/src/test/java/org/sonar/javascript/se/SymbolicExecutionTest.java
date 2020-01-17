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

import com.google.common.collect.ImmutableList;
import org.junit.Test;
import org.sonar.javascript.utils.TestUtils;
import org.sonar.javascript.visitors.JavaScriptVisitorContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.sonar.javascript.utils.TestUtils.createContext;

public class SymbolicExecutionTest {

  private SeVerifier verifier = new SeVerifier();

  @Test
  public void empty_function() throws Exception {
    runSe("empty_function.js");

    assertThat(verifier.endOfExecution).isTrue();
  }

  @Test
  public void block_execution_limit() throws Exception {
    runSe("block_execution_limit.js");
    assertThat(verifier.endOfExecution).isFalse();
  }

  @Test
  public void try_catch() throws Exception {
    runSe("try_catch.js");
    assertThat(verifier.endOfExecution).isFalse();
  }

  @Test
  public void initial_value() throws Exception {
    verifySE("initial_value.js");
  }

  @Test
  public void assignment() throws Exception {
    verifySE("assignment.js");
  }

  @Test
  public void stop_after_npe() throws Exception {
    verifySE("stop_after_npe.js");
  }

  @Test
  public void conditions() throws Exception {
    verifySE("conditions.js");
  }

  @Test
  public void single_value_constraints() throws Exception {
    verifySE("single_value_constraints.js");
  }

  @Test
  public void ternary() throws Exception {
    verifySE("ternary.js");
  }

  @Test
  public void branching() throws Exception {
    verifySE("branching.js");
  }

  @Test
  public void properties() throws Exception {
    verifySE("properties.js");
  }

  @Test
  public void loops() throws Exception {
    verifySE("loops.js");
  }

  @Test
  public void nullability() throws Exception {
    verifySE("nullability.js");
  }

  @Test
  public void typeof() throws Exception {
    verifySE("typeof.js");
  }

  @Test
  public void instanceof_test() throws Exception {
    verifySE("instanceof.js");
  }

  @Test
  public void test_live_variable_analysis() throws Exception {
    verifySE("lva.js");
  }

  @Test
  public void expressions() throws Exception {
    verifySE("expressions.js");
  }

  @Test
  public void relations() throws Exception {
    verifySE("relations.js");
  }

  @Test
  public void function_declaration() throws Exception {
    verifySE("func_decl.js");
  }

  @Test
  public void expression_stack_size() throws Exception {
    // should not fail
    verifySE("expression_stack_size.js");
  }

  @Test
  public void for_without_condition() throws Exception {
    // should not fail
    verifySE("for_without_condition.js");
  }

  @Test
  public void built_in() throws Exception {
    verifySE("built_in.js");
  }

  @Test
  public void arrays() throws Exception {
    verifySE("arrays.js");
  }

  @Test
  public void cross_procedure_single_return() throws Exception {
    verifySE("cross_procedure_single_return.js");
  }

  @Test
  public void cross_procedure_argument_constraints() throws Exception {
    verifySE("cross_procedure_argument_constraints.js");
  }

  @Test
  public void should_drop_constraints_on_arguments_of_functions_used_in_conditions() throws Exception {
    verifySE("drop_arguments_constraints_in_conditions.js");
  }

  @Test
  public void should_execute_flow_syntax() throws Exception {
    verifySE("flow_syntax.js");
  }

  private void runSe(String filename) {
    JavaScriptVisitorContext context = createContext(TestUtils.createTestInputFile("src/test/resources/se/", filename));
    verifier.scanExpectedIssues(context);
    SeChecksDispatcher seChecksDispatcher = new SeChecksDispatcher(ImmutableList.of((SeCheck) verifier));
    seChecksDispatcher.scanTree(context);
  }

  private void verifySE(String filename) {
    runSe(filename);
    verifier.verify();
    assertThat(verifier.endOfExecution).isTrue();
  }

}
