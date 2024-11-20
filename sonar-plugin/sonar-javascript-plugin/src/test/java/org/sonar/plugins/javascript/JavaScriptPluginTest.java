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
package org.sonar.plugins.javascript;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.slf4j.event.Level;
import org.sonar.api.*;
import org.sonar.api.config.PropertyDefinition;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;
import org.sonar.api.utils.Version;

class JavaScriptPluginTest {

  private static final int BASE_EXTENSIONS = 37;
  private static final int JS_ADDITIONAL_EXTENSIONS = 4;
  private static final int TS_ADDITIONAL_EXTENSIONS = 3;
  private static final int CSS_ADDITIONAL_EXTENSIONS = 3;
  private static final int SONARLINT_ADDITIONAL_EXTENSIONS = 1;

  public static final Version LTS_VERSION = Version.create(7, 9);

  @RegisterExtension
  public LogTesterJUnit5 logTester = new LogTesterJUnit5().setLevel(Level.DEBUG);

  @Test
  void count_extensions_lts() throws Exception {
    Plugin.Context context = setupContext(
      SonarRuntimeImpl.forSonarQube(LTS_VERSION, SonarQubeSide.SERVER, SonarEdition.COMMUNITY)
    );
    assertThat(context.getExtensions())
      .hasSize(
        BASE_EXTENSIONS +
        JS_ADDITIONAL_EXTENSIONS +
        TS_ADDITIONAL_EXTENSIONS +
        CSS_ADDITIONAL_EXTENSIONS
      );
  }

  @Test
  void should_contain_right_properties_number() throws Exception {
    assertThat(properties()).hasSize(13);
  }

  @Test
  void count_extensions_for_sonarlint() throws Exception {
    Plugin.Context context = setupContext(SonarRuntimeImpl.forSonarLint(LTS_VERSION));
    assertThat(context.getExtensions()).hasSize(BASE_EXTENSIONS + SONARLINT_ADDITIONAL_EXTENSIONS);
  }

  @Test
  void classNotAvailable() {
    var sonarLintPluginAPIVersion = mock(JavaScriptPlugin.SonarLintPluginAPIVersion.class);
    when(sonarLintPluginAPIVersion.isDependencyAvailable()).thenReturn(false);
    var sonarLintPluginAPIManager = new JavaScriptPlugin.SonarLintPluginAPIManager();
    var context = mock(Plugin.Context.class);

    sonarLintPluginAPIManager.addSonarLintExtensions(context, sonarLintPluginAPIVersion);
    assertThat(logTester.logs(Level.DEBUG))
      .containsExactly("Error while trying to inject SonarLint extensions");
  }

  @Test
  void globalsDefaultValue() {
    var globals = properties()
      .stream()
      .filter(property -> JavaScriptPlugin.GLOBALS.equals(property.key()))
      .findFirst();
    assertThat(globals).isPresent();

    var defaultValue = globals.get().defaultValue().split(",");
    assertThat(defaultValue)
      .containsExactly(
        "angular",
        "goog",
        "google",
        "OpenLayers",
        "d3",
        "dojo",
        "dojox",
        "dijit",
        "Backbone",
        "moment",
        "casper",
        "_",
        "sap"
      );
  }

  @Test
  void skipNodeProvisioningPropertyIsCorrectlyExposed() {
    var propertyDefinition = properties().stream().filter((item) -> {
      return Objects.equals(item.key(), "sonar.scanner.skipNodeProvisioning");
    }).findFirst().get();

    assertThat(propertyDefinition.name()).isEqualTo("Skip the deployment of the embedded Node.js runtime");
    assertThat(propertyDefinition.description()).isEqualTo("Controls whether the scanner should skip the deployment of the embedded Node.js runtime, and use the host-provided runtime instead.<br><br>Analysis will fail if a compatible version of Node.js is not provided via <code>sonar.nodejs.executable</code> or the <code>PATH</code>.");
    assertThat(propertyDefinition.type().toString()).isEqualTo("BOOLEAN");
    assertThat(propertyDefinition.defaultValue()).isEqualTo("false");
    assertThat(propertyDefinition.category()).isEqualTo("JavaScript / TypeScript");
    assertThat(propertyDefinition.subCategory()).isEqualTo("General");
  }

  private List<PropertyDefinition> properties() {
    var extensions = setupContext(
      SonarRuntimeImpl.forSonarQube(LTS_VERSION, SonarQubeSide.SERVER, SonarEdition.COMMUNITY)
    ).getExtensions();

    return extensions.stream().filter((extension) -> {
      return extension instanceof PropertyDefinition;
    }).toList();
  }

  private Plugin.Context setupContext(SonarRuntime runtime) {
    Plugin.Context context = new Plugin.Context(runtime);
    new JavaScriptPlugin().define(context);
    return context;
  }
}
