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

import java.nio.charset.StandardCharsets;
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

  @Test
  public void should_exclude_huge_files() {
    MapSettings mapSettings = new MapSettings();
    final int MAX_SIZE_SETTING = 128;
    mapSettings.setProperty("sonar.javascript.maxFileSize", "" + MAX_SIZE_SETTING);
    JavaScriptExclusionsFileFilter filter = new JavaScriptExclusionsFileFilter(mapSettings.asConfig());
    final long K = 1000L;
    long[] sizes = { 10, 10 * K, 100 * K, 150 * K, 200 * K };

    // Check that our test has not become degenerate after adjusting the threshold
    assertThat(sizes[sizes.length - 1])
      .withFailMessage("All example sizes are below threshold, the test must be adjusted.")
      .isGreaterThan(MAX_SIZE_SETTING);

    for (long size: sizes) {
      String content = syntheticJsFileContent(size);
      assertThat(filter.accept(inputFile("name.js", content)))
        .withFailMessage("Wrong result for size " + size)
        .isEqualTo(size < MAX_SIZE_SETTING);
    }
  }

  @Test
  public void should_log_negative_max_size() throws Exception {
    MapSettings mapSettings = new MapSettings();
    mapSettings.setProperty("sonar.javascript.maxFileSize", "-42");
    JavaScriptExclusionsFileFilter filter = new JavaScriptExclusionsFileFilter(mapSettings.asConfig());
    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("Maximum file size (sonar.javascript.maxFileSize) is not strictly positive: -42, falling back to 1000.");
  }

  @Test
  public void should_log_non_integer_max_size() throws Exception {
    MapSettings mapSettings = new MapSettings();
    mapSettings.setProperty("sonar.javascript.maxFileSize", "huge");
    JavaScriptExclusionsFileFilter filter = new JavaScriptExclusionsFileFilter(mapSettings.asConfig());
    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("Maximum file size (sonar.javascript.maxFileSize) is not an integer: \"huge\", falling back to 1000.");
  }

  /**
   * Generates a synthetic file with exported constants `N1`, `N2`, ... mapped to integers `1`, `2` ... in every line.
   * The size of the synthetic file is small as possible while being at least `approxSizeBytes`.
   *
   * @param approxSizeBytes approximate size of the file.
   */
  private String syntheticJsFileContent(long approxSizeBytes) {
    long counter = 0;
    StringBuilder bldr = new StringBuilder();
    long totalSize = 0;
    while (totalSize < approxSizeBytes) {
      String line = "export const N" + counter + " = " + counter + ";\n";
      totalSize += line.length();
      bldr.append(line);
      counter++;
    }
    return bldr.toString();
  }

  private DefaultInputFile inputFile(String file, String content) {
    return new TestInputFileBuilder("test","test_node_modules/" + file)
      .setLanguage(language(file))
      .setContents(content)
      .setCharset(StandardCharsets.UTF_8)
      .build();
  }

  private DefaultInputFile inputFile(String file) {
    return inputFile(file, "foo();");
  }

  private static String language(String filename) {
    String[] parts = filename.split("\\.");
    return parts[parts.length - 1];
  }

}
