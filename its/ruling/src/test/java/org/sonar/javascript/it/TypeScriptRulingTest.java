/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2021 SonarSource SA
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
package org.sonar.javascript.it;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class TypeScriptRulingTest extends JavaScriptRulingTest {

  public static Stream<Arguments> ruling() {
    return Stream.of(
      tsProject("ag-grid"),
      tsProject("ant-design"),
      tsProject("console"),
      tsProject("desktop"),
      tsProject("emission"),
      tsProject("file-for-rules"),
      tsProject("fireface"),
      tsProject("ionic2-auth"),
      tsProject("Joust"),
      tsProject("postgraphql"),
      tsProject("prettier-vscode"),
      tsProject("rxjs"),
      tsProject("searchkit"),
      tsProject("TypeScript")
      );
  }

  private static Arguments tsProject(String project) {
    return tsProject(project, Arrays.asList("**/*.d.ts", "**/*.js"));
  }

  private static Arguments tsProject(String project, List<String> exclusions) {
    return Arguments.of(project, "ts", "../typescript-test-sources/src/" + project, exclusions);
  }

  @ParameterizedTest
  @MethodSource
  @Override
  void ruling(String project, String language, String sourceDir, List<String> exclusions) throws Exception {
    runRulingTest(project, language, sourceDir, exclusions);
  }

}
