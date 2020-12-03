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

import java.util.ArrayList;
import java.util.List;
import org.junit.Test;
import org.sonar.api.Plugin;
import org.sonar.api.SonarEdition;
import org.sonar.api.SonarQubeSide;
import org.sonar.api.SonarRuntime;
import org.sonar.api.config.PropertyDefinition;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.utils.Version;

import static org.assertj.core.api.Assertions.assertThat;

public class JavaScriptPluginTest {

  private static final int BASE_EXTENSIONS = 23;
  private static final int JS_ADDITIONAL_EXTENSIONS = 4;
  private static final int TS_ADDITIONAL_EXTENSIONS = 3;

  public static final Version LTS_VERSION = Version.create(7, 9);

  @Test
  public void count_extensions_lts() throws Exception {
    Plugin.Context context = setupContext(SonarRuntimeImpl.forSonarQube(LTS_VERSION, SonarQubeSide.SERVER, SonarEdition.COMMUNITY));
    assertThat(context.getExtensions()).hasSize(BASE_EXTENSIONS + JS_ADDITIONAL_EXTENSIONS + TS_ADDITIONAL_EXTENSIONS);
  }

  @Test
  public void should_contain_right_properties_number() throws Exception {
    assertThat(properties()).hasSize(10);
  }

  @Test
  public void should_have_javascript_as_category_for_properties() throws Exception {
    List<PropertyDefinition> properties = properties();
    assertThat(properties).isNotEmpty();
    for (PropertyDefinition propertyDefinition : properties) {
      if (propertyDefinition.key().endsWith("lint.reportPaths")) {
        assertThat(propertyDefinition.category()).isEqualTo("External Analyzers");
      } else {
        assertThat(propertyDefinition.category()).isEqualTo("JavaScript / TypeScript");
      }
    }
  }

  @Test
  public void count_extensions_for_sonarlint() throws Exception {
    Plugin.Context context = setupContext(SonarRuntimeImpl.forSonarLint(LTS_VERSION));
    assertThat(context.getExtensions()).hasSize(BASE_EXTENSIONS);
  }

  private List<PropertyDefinition> properties() {
    List<PropertyDefinition> propertiesList = new ArrayList<>();
    List extensions = setupContext(SonarRuntimeImpl.forSonarQube(LTS_VERSION, SonarQubeSide.SERVER, SonarEdition.COMMUNITY)).getExtensions();

    for (Object extension : extensions) {
      if (extension instanceof PropertyDefinition) {
        propertiesList.add((PropertyDefinition) extension);
      }
    }

    return propertiesList;
  }

  private Plugin.Context setupContext(SonarRuntime runtime) {
    Plugin.Context context = new Plugin.Context(runtime);
    new JavaScriptPlugin().define(context);
    return context;
  }

}
