/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.filter;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.function.Function;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.slf4j.event.Level;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;
import org.sonar.api.utils.log.LoggerLevel;
import org.sonar.css.CssLanguage;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.TypeScriptLanguage;

class JavaScriptExclusionsFileFilterTest {

  private static final String EXCLUSIONS_DEFAULT_VALUE =
    "**/node_modules/**,**/bower_components/**";
  public static final String INFO_LOG_MSG =
    "Some of the project files were automatically excluded because they looked like generated " +
    "code. Enable debug logging to see which files were excluded. You can disable bundle detection by setting " +
    "sonar.javascript.detectBundles=false";
  public static final String DEBUG_LOG_MSG =
    "File bootstrap.js was excluded because it looks like a " +
    "bundle. (Disable detection with sonar.javascript.detectBundles=false)";

  @RegisterExtension
  LogTesterJUnit5 logTester = new LogTesterJUnit5().setLevel(Level.DEBUG);

  @TempDir
  Path tempDir;

  @Test
  void should_exclude_node_modules_and_bower_components_by_default() throws Exception {
    MapSettings settings = new MapSettings();
    JavaScriptExclusionsFileFilter filter = new JavaScriptExclusionsFileFilter(settings.asConfig());
    assertThat(filter.accept(inputFile("some_app.js"))).isTrue();
    assertThat(filter.accept(inputFile("some_app.ts"))).isTrue();
    assertThat(filter.accept(inputFile("node_modules/some_lib.js"))).isFalse();
    assertThat(filter.accept(inputFile("vendor/some_lib.js"))).isFalse();
    assertThat(filter.accept(inputFile("build/some_lib.js"))).isTrue();
    assertThat(filter.accept(inputFile("dist/some_lib.js"))).isFalse();
    assertThat(filter.accept(inputFile("external/some_lib.js"))).isFalse();
    assertThat(logTester.logs(LoggerLevel.DEBUG))
      .contains(
        "File test_node_modules/node_modules/some_lib.js was excluded by sonar.javascript.exclusions or sonar.typescript.exclusions"
      );
    assertThat(filter.accept(inputFile("node_modules/my_lib_folder/my_lib.js"))).isFalse();
    assertThat(filter.accept(inputFile("sub_module/node_modules/submodule_lib.js"))).isFalse();
    assertThat(filter.accept(inputFile("sub_module2/bower_components/bower_lib/lib.js"))).isFalse();
  }

  @Test
  void should_exclude_using_ts_property() throws Exception {
    MapSettings settings = new MapSettings();
    JavaScriptExclusionsFileFilter filter = new JavaScriptExclusionsFileFilter(settings.asConfig());
    assertThat(filter.accept(inputFile("some_app.js"))).isTrue();
    assertThat(filter.accept(inputFile("some_app.ts"))).isTrue();
    assertThat(filter.accept(inputFile("node_modules/some_lib.js"))).isFalse();
    assertThat(logTester.logs(LoggerLevel.DEBUG))
      .contains(
        "File test_node_modules/node_modules/some_lib.js was excluded by sonar.javascript.exclusions or sonar.typescript.exclusions"
      );
    assertThat(filter.accept(inputFile("node_modules/my_lib_folder/my_lib.js"))).isFalse();
    assertThat(filter.accept(inputFile("sub_module/node_modules/submodule_lib.js"))).isFalse();
    assertThat(filter.accept(inputFile("sub_module2/bower_components/bower_lib/lib.js"))).isFalse();
  }

  @Test
  void should_include_node_modules_when_property_is_overridden() throws Exception {
    MapSettings settings = new MapSettings();
    settings.setProperty(JavaScriptPlugin.JS_EXCLUSIONS_KEY, "");

    JavaScriptExclusionsFileFilter filter = new JavaScriptExclusionsFileFilter(settings.asConfig());

    assertThat(filter.accept(inputFile("some_app.js"))).isTrue();
    assertThat(filter.accept(inputFile("node_modules/some_lib.js"))).isTrue();
    assertThat(filter.accept(inputFile("sub_module2/bower_components/some_lib.js"))).isTrue();
  }

  @Test
  void should_exclude_using_custom_path_regex() throws Exception {
    MapSettings settings = new MapSettings();
    settings.setProperty(
      JavaScriptPlugin.JS_EXCLUSIONS_KEY,
      EXCLUSIONS_DEFAULT_VALUE + "," + "**/libs/**"
    );

    JavaScriptExclusionsFileFilter filter = new JavaScriptExclusionsFileFilter(settings.asConfig());

    assertThat(filter.accept(inputFile("some_app.js"))).isTrue();
    assertThat(filter.accept(inputFile("node_modules/some_lib.js"))).isFalse();
    assertThat(filter.accept(inputFile("libs/some_lib.js"))).isFalse();
  }

  @Test
  void should_ignore_empty_path_regex() throws Exception {
    MapSettings settings = new MapSettings();
    settings.setProperty(JavaScriptPlugin.JS_EXCLUSIONS_KEY, "," + EXCLUSIONS_DEFAULT_VALUE + ",");

    JavaScriptExclusionsFileFilter filter = new JavaScriptExclusionsFileFilter(settings.asConfig());

    assertThat(filter.accept(inputFile("some_app.js"))).isTrue();
    assertThat(filter.accept(inputFile("node_modules/some_lib.js"))).isFalse();
  }

  @Test
  void should_exclude_minified_files() {
    JavaScriptExclusionsFileFilter filter = new JavaScriptExclusionsFileFilter(
      new MapSettings().asConfig()
    );

    assertThat(filter.accept(inputFile("file.js"))).isTrue();
    assertThat(filter.accept(inputFile("file-min.js"))).isFalse();
    assertThat(filter.accept(inputFile("file.min.js"))).isFalse();
    assertThat(filter.accept(inputFile("file.css"))).isTrue();
    assertThat(filter.accept(inputFile("file-min.css"))).isFalse();
    assertThat(filter.accept(inputFile("file.min.css"))).isFalse();
  }

  @Test
  void should_exclude_huge_files() {
    MapSettings mapSettings = new MapSettings();
    final int MAX_SIZE_SETTING = 128;
    mapSettings.setProperty("sonar.javascript.maxFileSize", "" + MAX_SIZE_SETTING);
    mapSettings.setProperty(
      JavaScriptLanguage.FILE_SUFFIXES_KEY,
      JavaScriptLanguage.FILE_SUFFIXES_DEFVALUE
    );
    mapSettings.setProperty(
      TypeScriptLanguage.FILE_SUFFIXES_KEY,
      TypeScriptLanguage.FILE_SUFFIXES_DEFVALUE
    );
    JavaScriptExclusionsFileFilter filter = new JavaScriptExclusionsFileFilter(
      mapSettings.asConfig()
    );
    final long K = 1000L;
    long[] sizes = { 10, 10 * K, 100 * K, 150 * K, 200 * K, 800 * K, 2000 * K };

    // Check that our test has not become degenerate after adjusting the threshold
    assertThat(sizes[sizes.length - 1])
      .withFailMessage("All example sizes are below threshold, the test must be adjusted.")
      .isGreaterThan(MAX_SIZE_SETTING);

    for (long size : sizes) {
      for (String ending : new String[] { "js", "jsx", "ts", "tsx" }) {
        assertThat(filter.accept(inputFile("name." + ending, syntheticJsFileContent(size))))
          .withFailMessage("Wrong result for size " + size + " for file with ending " + ending)
          .isEqualTo(size < MAX_SIZE_SETTING * K);
      }

      // Input files in other languages should not be affected by size check (note `.java`-ending).
      assertThat(filter.accept(inputFile("name.java", syntheticJavaFileContent(size, "Foo"))))
        .withFailMessage("Wrong result for size " + size)
        .isTrue();

      // we ignore size limits for CSS files
      assertThat(filter.accept(inputFile("name.css", syntheticJsFileContent(size)))).isTrue();
    }
  }

  @Test
  void should_log_negative_max_size() throws Exception {
    MapSettings mapSettings = new MapSettings();
    mapSettings.setProperty("sonar.javascript.maxFileSize", "-42");
    JavaScriptExclusionsFileFilter filter = new JavaScriptExclusionsFileFilter(
      mapSettings.asConfig()
    );
    assertThat(logTester.logs(LoggerLevel.WARN))
      .contains(
        "Maximum file size (sonar.javascript.maxFileSize) is not strictly positive: -42, falling back to 1000."
      );
  }

  @Test
  void should_log_non_integer_max_size() throws Exception {
    MapSettings mapSettings = new MapSettings();
    mapSettings.setProperty("sonar.javascript.maxFileSize", "huge");
    JavaScriptExclusionsFileFilter filter = new JavaScriptExclusionsFileFilter(
      mapSettings.asConfig()
    );
    assertThat(logTester.logs(LoggerLevel.WARN))
      .contains(
        "Maximum file size (sonar.javascript.maxFileSize) is not an integer: \"huge\", falling back to 1000."
      );
  }

  @Test
  void should_exclude_definitely_typed_files() {
    MapSettings settings = new MapSettings();
    JavaScriptExclusionsFileFilter filter = new JavaScriptExclusionsFileFilter(settings.asConfig());
    assertThat(filter.accept(inputFile("foo.d.ts"))).isFalse();
    assertThat(filter.accept(inputFile("dir/foo.d.ts"))).isFalse();
    assertThat(logTester.logs(LoggerLevel.DEBUG))
      .contains(
        "File test_node_modules/dir/foo.d.ts was excluded by sonar.javascript.exclusions or sonar.typescript.exclusions"
      );
  }

  @Test
  void should_exclude_only_on_relative_path() throws Exception {
    // **/vendor/** is excluded by default, however it should only be excluded under 'basedir', here it's above
    Path basedirUnderVendor = tempDir.resolve("vendor/basedir");
    Path file = basedirUnderVendor.resolve("file.js");
    InputFile inputFile = new TestInputFileBuilder(
      "key",
      basedirUnderVendor.toFile(),
      file.toFile()
    )
      .setContents("alert('hello');")
      .setCharset(StandardCharsets.UTF_8)
      .setLanguage("js")
      .build();
    JavaScriptExclusionsFileFilter filter = new JavaScriptExclusionsFileFilter(
      new MapSettings().asConfig()
    );
    assertThat(filter.accept(inputFile)).isTrue();
  }

  @Test
  void should_exclude_only_jsts_files() throws Exception {
    JavaScriptExclusionsFileFilter filter = new JavaScriptExclusionsFileFilter(
      new MapSettings().asConfig()
    );
    InputFile inputFile = new TestInputFileBuilder("key", "vendor/file.js")
      .setContents("alert('hello');")
      .setLanguage("js")
      .setCharset(StandardCharsets.UTF_8)
      .build();
    assertThat(filter.accept(inputFile)).isFalse();

    inputFile =
      new TestInputFileBuilder("key", "vendor/file.ts")
        .setContents("alert('hello');")
        .setLanguage("ts")
        .setCharset(StandardCharsets.UTF_8)
        .build();
    assertThat(filter.accept(inputFile)).isFalse();

    inputFile =
      new TestInputFileBuilder("key", "vendor/file.ts")
        .setContents("alert('hello');")
        .setLanguage("xxx")
        .setCharset(StandardCharsets.UTF_8)
        .build();
    assertThat(filter.accept(inputFile)).isTrue();
  }

  @Test
  void should_exclude_css_with_patterns() throws Exception {
    var filter = new JavaScriptExclusionsFileFilter(new MapSettings().asConfig());
    var inputFile = new TestInputFileBuilder("key", "vendor/file.css")
      .setContents("h1 { color: blue } ")
      .setLanguage(CssLanguage.KEY)
      .setCharset(StandardCharsets.UTF_8)
      .build();
    assertThat(filter.accept(inputFile)).isFalse();
  }

  @Test
  void should_not_exclude_when_property_false() throws Exception {
    var config = new MapSettings()
      .setProperty("sonar.javascript.detectBundles", "false")
      .asConfig();
    var filter = new JavaScriptExclusionsFileFilter(config);
    var inputFile = new TestInputFileBuilder("key", "bootstrap.js")
      .setContents(BundleAssessorTest.BOOTSTRAP)
      .setLanguage(CssLanguage.KEY)
      .setCharset(StandardCharsets.UTF_8)
      .build();
    assertThat(filter.accept(inputFile)).isTrue();
    assertThat(logTester.logs(LoggerLevel.INFO)).isEmpty();
  }

  @Test
  void should_exclude_when_property_true() throws Exception {
    var inputFile = new TestInputFileBuilder("key", "bootstrap.js")
      .setContents(BundleAssessorTest.BOOTSTRAP)
      .setLanguage(CssLanguage.KEY)
      .setCharset(StandardCharsets.UTF_8)
      .build();

    var config = new MapSettings().setProperty("sonar.javascript.detectBundles", "true").asConfig();
    var filter = new JavaScriptExclusionsFileFilter(config);
    assertThat(filter.accept(inputFile)).isFalse();
    var logs = logTester.logs(LoggerLevel.INFO);
    assertThat(logs).contains(INFO_LOG_MSG);
    assertThat(logTester.logs(LoggerLevel.DEBUG)).contains(DEBUG_LOG_MSG);
    logTester.clear();

    // test that INFO level msg is logged only once
    assertThat(filter.accept(inputFile)).isFalse();
    assertThat(logTester.logs(LoggerLevel.DEBUG)).contains(DEBUG_LOG_MSG);
    assertThat(logTester.logs(LoggerLevel.INFO)).doesNotContain(INFO_LOG_MSG);
  }

  /**
   * Generates a synthetic file with exported constants `N1`, `N2`, ... mapped to integers `1`, `2` ... in every line.
   * The size of the synthetic file is small as possible while being at least `approxSizeBytes`.
   *
   * @param approxSizeBytes approximate size of the file.
   */
  private String syntheticFileContent(
    long approxSizeBytes,
    String prefix,
    Function<Long, String> statementForIdx,
    String suffix
  ) {
    long counter = 0;
    StringBuilder bldr = new StringBuilder(prefix);
    long totalSize = 0;
    while (totalSize < approxSizeBytes) {
      String line = statementForIdx.apply(counter);
      totalSize += line.length();
      bldr.append(line);
      counter++;
    }
    bldr.append(suffix);
    return bldr.toString();
  }

  private String syntheticJsFileContent(long approxSizeBytes) {
    return syntheticFileContent(
      approxSizeBytes,
      "",
      idx -> "export const N" + idx + " = " + idx + ";\n",
      ""
    );
  }

  private String syntheticJavaFileContent(long approxSizeBytes, String className) {
    return syntheticFileContent(
      approxSizeBytes,
      "public class " + className + " {",
      idx -> "public static final int N" + idx + " = " + idx + ";",
      "}\n"
    );
  }

  private DefaultInputFile inputFile(String file, String content) {
    return new TestInputFileBuilder("test", "test_node_modules/" + file)
      .setLanguage(language(file))
      .setContents(content)
      .setCharset(StandardCharsets.UTF_8)
      .build();
  }

  private DefaultInputFile inputFile(String file) {
    return inputFile(file, "foo();");
  }

  /** Attempts to infer the language key from the file ending. */
  private static String language(String filename) {
    String[] parts = filename.split("\\.");
    String ending = parts[parts.length - 1];
    if (JavaScriptLanguage.FILE_SUFFIXES_DEFVALUE.contains(ending)) {
      return JavaScriptLanguage.KEY;
    } else if (TypeScriptLanguage.FILE_SUFFIXES_DEFVALUE.contains(ending)) {
      return TypeScriptLanguage.KEY;
    } else if (CssLanguage.FILE_SUFFIXES_DEFVALUE.contains(ending)) {
      return CssLanguage.KEY;
    } else if ("java".contains(ending)) {
      return ending;
    } else {
      throw new IllegalArgumentException("Unknown file ending: " + ending);
    }
  }
}
