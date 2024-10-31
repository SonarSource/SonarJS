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
package org.sonar.plugins.javascript.analysis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.sonar.plugins.javascript.analysis.LookupConfigProviderFilter.FileFilter;
import static org.sonar.plugins.javascript.analysis.LookupConfigProviderFilter.PathFilter;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.sonar.api.config.Configuration;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.TypeScriptLanguage;

class LookupConfigProviderFilterTest {

  @TempDir
  Path baseDir;

  @Test
  void should_filter_default_files() throws IOException {
    MapSettings settings = new MapSettings();

    Configuration config = settings.asConfig();
    var filter = new FileFilter(config);

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

    Configuration config = settings.asConfig();
    var filter = new FileFilter(config);

    assertThat(filter.test(inputFile("file.js"))).isTrue();
    assertThat(filter.test(inputFile("file.ts"))).isTrue();
    assertThat(filter.test(inputFile("file.jsx"))).isFalse();
    assertThat(filter.test(inputFile("file.tsx"))).isFalse();
  }

  @Test
  void should_filter_default_paths() throws IOException {
    MapSettings settings = new MapSettings();
    Configuration config = settings.asConfig();
    var filter = new PathFilter(config);

    assertThat(filter.test(inputFile("node_modules", "file.js"))).isTrue();
    assertThat(filter.test(inputFile("bower_components", "file.jsx"))).isTrue();
    assertThat(filter.test(inputFile("file.d.ts"))).isTrue();
    assertThat(filter.test(inputFile("file.js"))).isFalse();
  }

  @Test
  void should_filter_specific_paths() throws IOException {
    MapSettings settings = new MapSettings();
    settings.setProperty(JavaScriptPlugin.JS_EXCLUSIONS_KEY, "**/foo/**");
    settings.setProperty(JavaScriptPlugin.TS_EXCLUSIONS_KEY, "**/bar/**");

    Configuration config = settings.asConfig();
    var filter = new PathFilter(config);

    assertThat(filter.test(inputFile("foo", "file.js"))).isTrue();
    assertThat(filter.test(inputFile("bar", "file.ts"))).isTrue();
    assertThat(filter.test(inputFile("qux", "file.cjs"))).isFalse();
    assertThat(filter.test(inputFile("file.vue"))).isFalse();
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
