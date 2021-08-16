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
import org.junit.jupiter.api.Test;
import org.junit.runner.RunWith;
import org.junit.runners.Parameterized;
import org.junit.runners.Parameterized.Parameters;

@RunWith(Parameterized.class)
public class TypeScriptRulingTest extends JavaScriptRulingTest {

  public TypeScriptRulingTest(String project, String language, String sourceDir, List<String> exclusions) {
    super(project, language, sourceDir, exclusions);
  }

  @Parameters(name = "{0}")
  public static Object[][] projects() {
    return new Object[][]{
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
      tsProject("TypeScript"),
    };
  }

  private static Object[] tsProject(String project) {
    return tsProject(project, Arrays.asList("**/*.d.ts", "**/*.js"));
  }

  private static Object[] tsProject(String project, List<String> exclusions) {
    return new Object[]{project, "ts", "../typescript-test-sources/src/" + project, exclusions};
  }

  @Test
  public void ruling() throws Exception {
    runRulingTest(project, language, sourceDir, exclusions);
  }

}
