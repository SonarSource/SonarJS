/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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
import org.sonar.api.SonarQubeSide;
import org.sonar.api.SonarRuntime;
import org.sonar.api.config.PropertyDefinition;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.utils.Version;

import static org.assertj.core.api.Assertions.assertThat;

public class JavaScriptPluginTest {

  @Test
  public void count_extensions_lts() throws Exception {
    Plugin.Context context = setupContext(SonarRuntimeImpl.forSonarQube(Version.create(6, 7), SonarQubeSide.SERVER));
    assertThat(context.getExtensions()).hasSize(15);
  }

  @Test
  public void count_extensions_external_issues_supported() throws Exception {
    Plugin.Context context = setupContext(SonarRuntimeImpl.forSonarQube(Version.create(7, 2), SonarQubeSide.SERVER));
    assertThat(context.getExtensions()).hasSize(17);
  }

  @Test
  public void should_contain_right_properties_number() throws Exception {
    assertThat(properties()).hasSize(7);
  }

  @Test
  public void should_have_default_for_exclusions() throws Exception {
    assertThat(properties().stream().filter(prop -> JavaScriptPlugin.JS_EXCLUSIONS_KEY.equals(prop.key())).findFirst()
      .get().defaultValue()).isEqualToIgnoringCase("**/node_modules/**,**/bower_components/**");
  }

  @Test
  public void should_have_javascript_as_category_for_properties() throws Exception {
    List<PropertyDefinition> properties = properties();
    assertThat(properties).isNotEmpty();
    for (PropertyDefinition propertyDefinition : properties) {
      assertThat(propertyDefinition.category()).isEqualTo("JavaScript");
    }
  }

  @Test
  public void count_extensions_for_sonarlint() throws Exception {
    Plugin.Context context = setupContext(SonarRuntimeImpl.forSonarLint(Version.create(6, 7)));
    assertThat(context.getExtensions()).hasSize(13);
  }

  private List<PropertyDefinition> properties() {
    List<PropertyDefinition> propertiesList = new ArrayList<>();
    List extensions = setupContext(SonarRuntimeImpl.forSonarQube(Version.create(5, 6), SonarQubeSide.SERVER)).getExtensions();

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
