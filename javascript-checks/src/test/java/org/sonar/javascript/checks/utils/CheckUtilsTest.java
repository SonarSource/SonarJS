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
package org.sonar.javascript.checks.utils;

import com.sonar.sslr.api.typed.ActionParser;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Arrays;
import java.util.List;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.javascript.checks.verifier.TestUtils;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.javascript.visitors.JavaScriptFileImpl;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;

import static org.assertj.core.api.Assertions.assertThat;
import static org.sonar.javascript.checks.utils.CheckUtils.readLines;

public class CheckUtilsTest {

  protected final ActionParser<Tree> p = JavaScriptParserBuilder.createParser();

  @Rule
  public final TemporaryFolder temporaryFolder = new TemporaryFolder();

  @Test
  public void testAsString() throws Exception {
    Tree tree = p.parse("[, a, , ]");
    assertThat(CheckUtils.asString(tree)).isEqualTo("[, a, , ]");
  }

  @Test
  public void testIsDescendant() throws Exception {
    ScriptTree scriptTree = (ScriptTree) p.parse("function foo(){}");
    FunctionDeclarationTree functionDeclarationTree = (FunctionDeclarationTree) scriptTree.items().items().get(0);

    assertThat(CheckUtils.isDescendant(functionDeclarationTree, scriptTree)).isTrue();
    assertThat(CheckUtils.isDescendant(functionDeclarationTree.functionKeyword(), scriptTree)).isTrue();
    assertThat(CheckUtils.isDescendant(functionDeclarationTree.parameterClause().closeParenthesisToken(), scriptTree)).isTrue();
    assertThat(CheckUtils.isDescendant(scriptTree, functionDeclarationTree)).isFalse();
    assertThat(CheckUtils.isDescendant(functionDeclarationTree.functionKeyword(), functionDeclarationTree.parameterClause())).isFalse();
  }

  @Test
  public void testReadLines() throws IOException {
    List<String> lines = Arrays.asList("first", "second", "third");
    File tmp = temporaryFolder.newFile();
    Files.write(tmp.toPath(), String.join("\n", lines).getBytes());

    DefaultInputFile testInputFile = TestUtils.createTestInputFile(temporaryFolder.getRoot(), tmp.getName(), StandardCharsets.UTF_8);
    assertThat(readLines(new JavaScriptFileImpl(testInputFile))).isEqualTo(lines);
  }
}
