/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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

import org.junit.Test;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.config.MapSettings;
import org.sonar.api.config.Settings;

import static org.assertj.core.api.Assertions.assertThat;

public class JavaScriptExclusionsFileFilterTest {

  @Test
  public void should_exclude_node_modules() throws Exception {
    MapSettings settings = new MapSettings();
    settings.setProperty(JavaScriptPlugin.JAVA_SCRIPT_EXCLUSIONS_KEY, JavaScriptPlugin.JAVA_SCRIPT_EXCLUSIONS_DEFAULT_VALUE);
    JavaScriptExclusionsFileFilter filter = new JavaScriptExclusionsFileFilter(settings);
    assertThat(filter.accept(inputFile("some_app.js"))).isTrue();
    assertThat(filter.accept(inputFile("node_modules/some_lib.js"))).isFalse();
    assertThat(filter.accept(inputFile("node_modules/my_lib_folder/my_lib.js"))).isFalse();
    assertThat(filter.accept(inputFile("node_modules/sub_module/node_modules/submodult_lib.js"))).isFalse();
  }

  @Test
  public void should_include_node_modules_when_property_is_overridden() throws Exception {
    Settings settings = new MapSettings();
    settings.setProperty(JavaScriptPlugin.JAVA_SCRIPT_EXCLUSIONS_KEY, "");

    JavaScriptExclusionsFileFilter filter = new JavaScriptExclusionsFileFilter(settings);

    assertThat(filter.accept(inputFile("some_app.js"))).isTrue();
    assertThat(filter.accept(inputFile("node_modules/some_lib.js"))).isTrue();
  }

  @Test
  public void should_exclude_using_multiple_regexes() throws Exception {
    Settings settings = new MapSettings();
    settings.setProperty(
      JavaScriptPlugin.JAVA_SCRIPT_EXCLUSIONS_KEY, JavaScriptPlugin.JAVA_SCRIPT_EXCLUSIONS_DEFAULT_VALUE + "," + ".*/bower_components/.*");

    JavaScriptExclusionsFileFilter filter = new JavaScriptExclusionsFileFilter(settings);

    assertThat(filter.accept(inputFile("some_app.js"))).isTrue();
    assertThat(filter.accept(inputFile("node_modules/some_lib.js"))).isFalse();
    assertThat(filter.accept(inputFile("libs/bower_components/some_lib.js"))).isFalse();
  }

  private DefaultInputFile inputFile(String file) {
    return new TestInputFileBuilder("test","test_node_modules/" + file).build();
  }

}
