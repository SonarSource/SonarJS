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
import static org.sonar.plugins.javascript.analysis.LookupConfigProviderFilter.FileFilter;
import static org.sonar.plugins.javascript.analysis.LookupConfigProviderFilter.PathFilter;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.TypeScriptLanguage;

class LookupConfigProviderFilterTest {

  @TempDir
  Path baseDir;

  @Test
  void should_filter_default_files() throws IOException {
    var sensorContext = SensorContextTester.create(baseDir.getRoot());
    sensorContext.setSettings(new MapSettings());
    var filter = new FileFilter(new JsTsContext(sensorContext));

    assertThat(filter.test(inputFile("file.js"))).isTrue();
    assertThat(filter.test(inputFile("file.ts"))).isTrue();
    assertThat(filter.test(inputFile("file.jsx"))).isTrue();
    assertThat(filter.test(inputFile("file.tsx"))).isTrue();
  }

  @Test
  void should_filter_specific_files() throws IOException {
    MapSettings settings = new MapSettings();
    settings.setProperty(JavaScriptLanguage.FILE_SUFFIXES_KEY, ".js");
    settings.setProperty(TypeScriptLanguage.FILE_SUFFIXES_KEY, ".ts");

    var sensorContext = SensorContextTester.create(baseDir.getRoot());
    sensorContext.setSettings(settings);
    var filter = new FileFilter(new JsTsContext(sensorContext));

    assertThat(filter.test(inputFile("file.js"))).isTrue();
    assertThat(filter.test(inputFile("file.ts"))).isTrue();
    assertThat(filter.test(inputFile("file.jsx"))).isFalse();
    assertThat(filter.test(inputFile("file.tsx"))).isFalse();
  }

  @Test
  void should_filter_default_paths() throws IOException {
    var sensorContext = SensorContextTester.create(baseDir.getRoot());
    sensorContext.setSettings(new MapSettings());
    var filter = new PathFilter(new JsTsContext<SensorContextTester>(sensorContext));

    assertThat(filter.test(inputFile("node_modules", "file.js"))).isFalse();
    assertThat(filter.test(inputFile("bower_components", "file.jsx"))).isFalse();
    assertThat(filter.test(inputFile("file.d.ts"))).isFalse();
    assertThat(filter.test(inputFile("file.js"))).isTrue();
  }

  @Test
  void should_filter_specific_paths() throws IOException {
    MapSettings settings = new MapSettings();
    settings.setProperty(JavaScriptPlugin.JS_EXCLUSIONS_KEY, "**/foo/**");
    settings.setProperty(JavaScriptPlugin.TS_EXCLUSIONS_KEY, "**/bar/**");

    var sensorContext = SensorContextTester.create(baseDir.getRoot());
    sensorContext.setSettings(settings);
    var filter = new PathFilter(new JsTsContext<SensorContextTester>(sensorContext));

    assertThat(filter.test(inputFile("foo", "file.js"))).isFalse();
    assertThat(filter.test(inputFile("bar", "file.ts"))).isFalse();
    assertThat(filter.test(inputFile("qux", "file.cjs"))).isTrue();
    assertThat(filter.test(inputFile("file.vue"))).isTrue();
  }

  private Path inputFile(String filename) throws IOException {
    var path = baseDir.resolve(filename);
    return Files.writeString(path, "some character sequence");
  }

  private Path inputFile(String dir, String filename) throws IOException {
    var path = Files.createDirectories(baseDir.resolve(dir)).resolve(filename);
    Files.writeString(path, "some character sequence");
    return path;
  }
}
