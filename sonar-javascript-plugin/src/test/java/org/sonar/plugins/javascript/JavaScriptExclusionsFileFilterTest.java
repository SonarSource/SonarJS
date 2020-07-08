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
package org.sonar.plugins.javascript;

import org.junit.Rule;
import org.junit.Test;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.api.utils.log.LogTester;
import org.sonar.api.utils.log.LoggerLevel;

import static org.assertj.core.api.Assertions.assertThat;

public class JavaScriptExclusionsFileFilterTest {

  private static final String EXCLUSIONS_DEFAULT_VALUE = "**/node_modules/**,**/bower_components/**";

  @Rule
  public LogTester logTester = new LogTester();

  @Test
  public void should_exclude_node_modules_and_bower_components() throws Exception {
    MapSettings settings = new MapSettings();
    settings.setProperty(JavaScriptPlugin.JS_EXCLUSIONS_KEY, EXCLUSIONS_DEFAULT_VALUE);
    JavaScriptExclusionsFileFilter filter = new JavaScriptExclusionsFileFilter(settings.asConfig());
    assertThat(filter.accept(inputFile("some_app.js"))).isTrue();
    assertThat(filter.accept(inputFile("some_app.ts"))).isTrue();
    assertThat(filter.accept(inputFile("node_modules/some_lib.js"))).isFalse();
    assertThat(logTester.logs(LoggerLevel.DEBUG)).contains("File test_node_modules/node_modules/some_lib.js was excluded by sonar.javascript.exclusions or sonar.typescript.exclusions");
    assertThat(filter.accept(inputFile("node_modules/my_lib_folder/my_lib.js"))).isFalse();
    assertThat(filter.accept(inputFile("sub_module/node_modules/submodule_lib.js"))).isFalse();
    assertThat(filter.accept(inputFile("sub_module2/bower_components/bower_lib/lib.js"))).isFalse();
  }

  @Test
  public void should_exclude_using_ts_property() throws Exception {
    MapSettings settings = new MapSettings();
    settings.setProperty(JavaScriptPlugin.TS_EXCLUSIONS_KEY, EXCLUSIONS_DEFAULT_VALUE);
    JavaScriptExclusionsFileFilter filter = new JavaScriptExclusionsFileFilter(settings.asConfig());
    assertThat(filter.accept(inputFile("some_app.js"))).isTrue();
    assertThat(filter.accept(inputFile("some_app.ts"))).isTrue();
    assertThat(filter.accept(inputFile("node_modules/some_lib.js"))).isFalse();
    assertThat(logTester.logs(LoggerLevel.DEBUG)).contains("File test_node_modules/node_modules/some_lib.js was excluded by sonar.javascript.exclusions or sonar.typescript.exclusions");
    assertThat(filter.accept(inputFile("node_modules/my_lib_folder/my_lib.js"))).isFalse();
    assertThat(filter.accept(inputFile("sub_module/node_modules/submodule_lib.js"))).isFalse();
    assertThat(filter.accept(inputFile("sub_module2/bower_components/bower_lib/lib.js"))).isFalse();
  }

  @Test
  public void should_include_node_modules_when_property_is_overridden() throws Exception {
    MapSettings settings = new MapSettings();
    settings.setProperty(JavaScriptPlugin.JS_EXCLUSIONS_KEY, "");

    JavaScriptExclusionsFileFilter filter = new JavaScriptExclusionsFileFilter(settings.asConfig());

    assertThat(filter.accept(inputFile("some_app.js"))).isTrue();
    assertThat(filter.accept(inputFile("node_modules/some_lib.js"))).isTrue();
    assertThat(filter.accept(inputFile("sub_module2/bower_components/some_lib.js"))).isTrue();
  }

  @Test
  public void should_exclude_using_custom_path_regex() throws Exception {
    MapSettings settings = new MapSettings();
    settings.setProperty(
      JavaScriptPlugin.JS_EXCLUSIONS_KEY, EXCLUSIONS_DEFAULT_VALUE + "," + "**/libs/**");

    JavaScriptExclusionsFileFilter filter = new JavaScriptExclusionsFileFilter(settings.asConfig());

    assertThat(filter.accept(inputFile("some_app.js"))).isTrue();
    assertThat(filter.accept(inputFile("node_modules/some_lib.js"))).isFalse();
    assertThat(filter.accept(inputFile("libs/some_lib.js"))).isFalse();
  }

  @Test
  public void should_ignore_empty_path_regex() throws Exception {
    MapSettings settings = new MapSettings();
    settings.setProperty(JavaScriptPlugin.JS_EXCLUSIONS_KEY, "," + EXCLUSIONS_DEFAULT_VALUE + ",");

    JavaScriptExclusionsFileFilter filter = new JavaScriptExclusionsFileFilter(settings.asConfig());

    assertThat(filter.accept(inputFile("some_app.js"))).isTrue();
    assertThat(filter.accept(inputFile("node_modules/some_lib.js"))).isFalse();
  }

  @Test
  public void should_exclude_minified_files() {
    JavaScriptExclusionsFileFilter filter = new JavaScriptExclusionsFileFilter(new MapSettings().asConfig());

    assertThat(filter.accept(inputFile("file.js"))).isTrue();
    assertThat(filter.accept(inputFile("file-min.js"))).isFalse();
    assertThat(filter.accept(inputFile("file.min.js"))).isFalse();
  }


  private DefaultInputFile inputFile(String file) {
    return new TestInputFileBuilder("test","test_node_modules/" + file)
      .setLanguage(language(file))
      .setContents("foo();")
      .build();
  }

  private static String language(String filename) {
    String[] parts = filename.split("\\.");
    return parts[parts.length - 1];
  }

}
