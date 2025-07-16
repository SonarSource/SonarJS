/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.analysis;

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
import org.sonar.css.CssLanguage;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.TypeScriptLanguage;

class JsTsExclusionsFilterTest {

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
  void should_exclude_node_modules_and_bower_components_by_default() {
    MapSettings settings = new MapSettings();
    JsTsExclusionsFilter filter = new JsTsExclusionsFilter(settings.asConfig());
    assertThat(filter.accept(inputFile("some_app.js"))).isTrue();
    assertThat(filter.accept(inputFile("some_app.ts"))).isTrue();
    assertThat(filter.accept(inputFile("node_modules/some_lib.js"))).isFalse();
    assertThat(filter.accept(inputFile("vendor/some_lib.js"))).isFalse();
    assertThat(filter.accept(inputFile("build/some_lib.js"))).isTrue();
    assertThat(filter.accept(inputFile("dist/some_lib.js"))).isFalse();
    assertThat(filter.accept(inputFile("external/some_lib.js"))).isFalse();
    assertThat(filter.accept(inputFile("contrib/some_lib.js"))).isFalse();
    assertThat(filter.accept(inputFile(".git/another.js"))).isFalse();
    assertThat(logTester.logs(Level.DEBUG)).contains(
      "File test_node_modules/node_modules/some_lib.js was excluded by sonar.javascript.exclusions or sonar.typescript.exclusions"
    );
    assertThat(filter.accept(inputFile("node_modules/my_lib_folder/my_lib.js"))).isFalse();
    assertThat(filter.accept(inputFile("sub_module/node_modules/submodule_lib.js"))).isFalse();
    assertThat(filter.accept(inputFile("sub_module2/bower_components/bower_lib/lib.js"))).isFalse();
  }

  @Test
  void should_exclude_using_ts_property() {
    MapSettings settings = new MapSettings();
    JsTsExclusionsFilter filter = new JsTsExclusionsFilter(settings.asConfig());
    assertThat(filter.accept(inputFile("some_app.js"))).isTrue();
    assertThat(filter.accept(inputFile("some_app.ts"))).isTrue();
    assertThat(filter.accept(inputFile("node_modules/some_lib.js"))).isFalse();
    assertThat(logTester.logs(Level.DEBUG)).contains(
      "File test_node_modules/node_modules/some_lib.js was excluded by sonar.javascript.exclusions or sonar.typescript.exclusions"
    );
    assertThat(filter.accept(inputFile("node_modules/my_lib_folder/my_lib.js"))).isFalse();
    assertThat(filter.accept(inputFile("sub_module/node_modules/submodule_lib.js"))).isFalse();
    assertThat(filter.accept(inputFile("sub_module2/bower_components/bower_lib/lib.js"))).isFalse();
  }

  @Test
  void should_include_node_modules_when_property_is_overridden() {
    MapSettings settings = new MapSettings();
    settings.setProperty(JavaScriptPlugin.JS_EXCLUSIONS_KEY, "");

    JsTsExclusionsFilter filter = new JsTsExclusionsFilter(settings.asConfig());

    assertThat(filter.accept(inputFile("some_app.js"))).isTrue();
    assertThat(filter.accept(inputFile("node_modules/some_lib.js"))).isTrue();
    assertThat(filter.accept(inputFile("sub_module2/bower_components/some_lib.js"))).isTrue();
  }

  @Test
  void should_exclude_using_custom_path_glob() {
    MapSettings settings = new MapSettings();
    settings.setProperty(
      JavaScriptPlugin.JS_EXCLUSIONS_KEY,
      EXCLUSIONS_DEFAULT_VALUE + "," + "**/libs/**"
    );

    JsTsExclusionsFilter filter = new JsTsExclusionsFilter(settings.asConfig());

    assertThat(filter.accept(inputFile("some_app.js"))).isTrue();
    assertThat(filter.accept(inputFile("node_modules/some_lib.js"))).isFalse();
    assertThat(filter.accept(inputFile("libs/some_lib.js"))).isFalse();
  }

  @Test
  void should_ignore_empty_path_glob() {
    MapSettings settings = new MapSettings();
    settings.setProperty(JavaScriptPlugin.JS_EXCLUSIONS_KEY, "," + EXCLUSIONS_DEFAULT_VALUE + ",");

    JsTsExclusionsFilter filter = new JsTsExclusionsFilter(settings.asConfig());

    assertThat(filter.accept(inputFile("some_app.js"))).isTrue();
    assertThat(filter.accept(inputFile("node_modules/some_lib.js"))).isFalse();
  }

  @Test
  void should_exclude_definitely_typed_files() {
    MapSettings settings = new MapSettings();
    JsTsExclusionsFilter filter = new JsTsExclusionsFilter(settings.asConfig());
    assertThat(filter.accept(inputFile("foo.d.ts"))).isFalse();
    assertThat(filter.accept(inputFile("dir/foo.d.ts"))).isFalse();
    assertThat(logTester.logs(Level.DEBUG)).contains(
      "File test_node_modules/dir/foo.d.ts was excluded by sonar.javascript.exclusions or sonar.typescript.exclusions"
    );
  }

  @Test
  void should_exclude_only_on_relative_path() {
    // **/vendor/** is excluded by default; however, it should only be excluded under 'basedir', here it's above
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
    JsTsExclusionsFilter filter = new JsTsExclusionsFilter(new MapSettings().asConfig());
    assertThat(filter.accept(inputFile)).isTrue();
  }

  @Test
  void should_exclude_only_jsts_files() {
    JsTsExclusionsFilter filter = new JsTsExclusionsFilter(new MapSettings().asConfig());
    InputFile inputFile = new TestInputFileBuilder("key", "vendor/file.js")
      .setContents("alert('hello');")
      .setLanguage("js")
      .setCharset(StandardCharsets.UTF_8)
      .build();
    assertThat(filter.accept(inputFile)).isFalse();

    inputFile = new TestInputFileBuilder("key", "vendor/file.ts")
      .setContents("alert('hello');")
      .setLanguage("ts")
      .setCharset(StandardCharsets.UTF_8)
      .build();
    assertThat(filter.accept(inputFile)).isFalse();

    inputFile = new TestInputFileBuilder("key", "vendor/file.ts")
      .setContents("alert('hello');")
      .setLanguage("xxx")
      .setCharset(StandardCharsets.UTF_8)
      .build();
    assertThat(filter.accept(inputFile)).isTrue();
  }

  @Test
  void should_exclude_css_with_patterns() {
    var filter = new JsTsExclusionsFilter(new MapSettings().asConfig());
    var inputFile = new TestInputFileBuilder("key", "vendor/file.css")
      .setContents("h1 { color: blue } ")
      .setLanguage(CssLanguage.KEY)
      .setCharset(StandardCharsets.UTF_8)
      .build();
    assertThat(filter.accept(inputFile)).isFalse();
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
    if (JavaScriptLanguage.DEFAULT_FILE_SUFFIXES.contains(ending)) {
      return JavaScriptLanguage.KEY;
    } else if (TypeScriptLanguage.DEFAULT_FILE_SUFFIXES.contains(ending)) {
      return TypeScriptLanguage.KEY;
    } else if (CssLanguage.DEFAULT_FILE_SUFFIXES.contains(ending)) {
      return CssLanguage.KEY;
    } else if ("java".contains(ending)) {
      return ending;
    } else {
      throw new IllegalArgumentException("Unknown file ending: " + ending);
    }
  }
}
