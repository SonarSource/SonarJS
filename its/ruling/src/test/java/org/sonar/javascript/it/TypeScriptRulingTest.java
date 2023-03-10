/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2023 SonarSource SA
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

import java.util.stream.Stream;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class TypeScriptRulingTest extends JavaScriptRulingTest {

  public static Stream<Arguments> ruling() {
    return Stream.of(
      tsProject("ag-grid", "spec"),
      tsProject("ant-design", "tests"), // todo: many dirs **/__tests__
      tsProject("console", ""), // todo: many dirs **/__tests__
      tsProject("courselit", ""),
      tsProject("desktop", "app/test"),
      tsProject("eigen", ""), // todo
      tsProject("file-for-rules", ""),
      tsProject("fireface", ""),
      tsProject("ionic2-auth", ""),
      tsProject("Joust", ""), // todo: files **/*.spec.ts
      tsProject("moose", ""),
      tsProject("postgraphql", ""), // todo: many dirs **/__tests__
      tsProject("prettier-vscode", ""),
      tsProject("rxjs", "spec"),
      tsProject("searchkit", ""), // todo
      tsProject("TypeScript", "src/harness/unittests"),
      tsProject("vuetify", "")
      );
  }

  private static Arguments tsProject(String project, String testDir) {
    return tsProject(project, "**/*.d.ts, **/*.js", testDir);
  }

  private static Arguments tsProject(String project, String exclusions, String testDir) {
    return Arguments.of(project, "ts", "../typescript-test-sources/src/" + project, exclusions, testDir);
  }

  @ParameterizedTest
  @MethodSource
  @Execution(ExecutionMode.CONCURRENT)
  @Override
  void ruling(String project, String language, String sourceDir, String exclusions, String testDir) throws Exception {
    runRulingTest(project, language, sourceDir, exclusions, testDir);
  }

}
