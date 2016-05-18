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
package org.sonar.javascript.se;

import com.google.common.base.Charsets;
import com.google.common.collect.ImmutableList;
import java.io.File;
import org.junit.Test;
import org.sonar.api.config.Settings;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.javascript.visitors.JavaScriptVisitorContext;
import org.sonar.plugins.javascript.api.tree.ScriptTree;

import static org.fest.assertions.Assertions.assertThat;

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
    runSe("initial_value.js");
  }

  @Test
  public void assignment() throws Exception {
    runSe("assignment.js");
  }

  @Test
  public void stop_after_npe() throws Exception {
    runSe("stop_after_npe.js");
  }
  
  @Test
  public void conditions() throws Exception {
    runSe("conditions.js");
  }

  @Test
  public void ternary() throws Exception {
    runSe("ternary.js");
  }

  @Test
  public void branching() throws Exception {
    runSe("branching.js");
  }

  @Test
  public void properties() throws Exception {
    runSe("properties.js");
  }

  @Test
  public void loops() throws Exception {
    runSe("loops.js");
  }

  @Test
  public void nullability() throws Exception {
    runSe("nullability.js");
  }

  @Test
  public void typeof() throws Exception {
    runSe("typeof.js");
  }

  private void runSe(String filename) {
    JavaScriptVisitorContext context = createContext(new File("src/test/resources/se/", filename));
    verifier.scanExpectedIssues(context);
    SeChecksDispatcher seChecksDispatcher = new SeChecksDispatcher(ImmutableList.of((SeCheck) verifier));
    seChecksDispatcher.scanTree(context);
    verifier.verify();
  }

  private static JavaScriptVisitorContext createContext(File file) {
    ScriptTree scriptTree = (ScriptTree) JavaScriptParserBuilder.createParser(Charsets.UTF_8).parse(file);
    return new JavaScriptVisitorContext(scriptTree, file, new Settings());
  }

}
