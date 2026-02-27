/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
package org.sonar.plugins.javascript;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Objects;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.slf4j.event.Level;
import org.sonar.api.Plugin;
import org.sonar.api.SonarEdition;
import org.sonar.api.SonarQubeSide;
import org.sonar.api.SonarRuntime;
import org.sonar.api.config.PropertyDefinition;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;
import org.sonar.api.utils.Version;

class JavaScriptPluginTest {

  public static final Version LTS_VERSION = Version.create(7, 9);

  @RegisterExtension
  public LogTesterJUnit5 logTester = new LogTesterJUnit5().setLevel(Level.DEBUG);

  @Test
  void count_extensions_lts() {
    Plugin.Context context = setupContext(
      SonarRuntimeImpl.forSonarQube(LTS_VERSION, SonarQubeSide.SERVER, SonarEdition.COMMUNITY)
    );
    assertThat(context.getExtensions()).isNotEmpty();
  }

  @Test
  void should_contain_right_properties_number() {
    assertThat(properties()).isNotEmpty();
  }

  @Test
  void count_extensions_for_sonarlint() {
    Plugin.Context context = setupContext(SonarRuntimeImpl.forSonarLint(LTS_VERSION));
    assertThat(context.getExtensions()).isNotEmpty();
  }

  @Test
  void classNotAvailable() {
    var sonarLintPluginAPIVersion = mock(JavaScriptPlugin.SonarLintPluginAPIVersion.class);
    when(sonarLintPluginAPIVersion.isDependencyAvailable()).thenReturn(false);
    var sonarLintPluginAPIManager = new JavaScriptPlugin.SonarLintPluginAPIManager();
    var context = mock(Plugin.Context.class);

    sonarLintPluginAPIManager.addSonarLintExtensions(context, sonarLintPluginAPIVersion);
    assertThat(logTester.logs(Level.DEBUG)).containsExactly(
      "Error while trying to inject SonarLint extensions"
    );
  }

  @Test
  void globalsDefaultValue() {
    var globals = properties()
      .stream()
      .filter(property -> JavaScriptPlugin.GLOBALS.equals(property.key()))
      .findFirst();
    assertThat(globals).isPresent();

    var defaultValue = globals.get().defaultValue().split(",");
    assertThat(defaultValue).containsExactly(
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
    var propertyDefinition = properties()
      .stream()
      .filter(item -> {
        return Objects.equals(item.key(), "sonar.scanner.skipNodeProvisioning");
      })
      .findFirst()
      .get();

    assertThat(propertyDefinition.name()).isEqualTo(
      "Skip the deployment of the embedded Node.js runtime"
    );
    assertThat(propertyDefinition.description()).isEqualTo(
      "Controls whether the scanner should skip the deployment of the embedded Node.js runtime, and use the host-provided runtime instead.<br><br>Analysis will fail if a compatible version of Node.js is not provided via <code>sonar.nodejs.executable</code> or the <code>PATH</code>."
    );
    assertThat(propertyDefinition.type().toString()).isEqualTo("BOOLEAN");
    assertThat(propertyDefinition.defaultValue()).isEqualTo("false");
    assertThat(propertyDefinition.category()).isEqualTo("JavaScript / TypeScript");
    assertThat(propertyDefinition.subCategory()).isEqualTo("General");
  }

  @Test
  void createTSProgramForOrphanFilesPropertyIsCorrectlyExposed() {
    var propertyDefinition = properties()
      .stream()
      .filter(item -> {
        return Objects.equals(item.key(), "sonar.javascript.createTSProgramForOrphanFiles");
      })
      .findFirst()
      .get();

    assertThat(propertyDefinition.name()).isEqualTo("Create TypeScript program for orphan files");
    assertThat(propertyDefinition.type().toString()).isEqualTo("BOOLEAN");
    assertThat(propertyDefinition.defaultValue()).isEqualTo("true");
    assertThat(propertyDefinition.category()).isEqualTo("JavaScript / TypeScript");
    assertThat(propertyDefinition.subCategory()).isEqualTo("TypeScript");
  }

  @Test
  void disableTypeCheckingPropertyIsCorrectlyExposed() {
    var propertyDefinition = properties()
      .stream()
      .filter(item -> {
        return Objects.equals(item.key(), "sonar.javascript.disableTypeChecking");
      })
      .findFirst()
      .get();

    assertThat(propertyDefinition.name()).isEqualTo("Disable TypeScript type checking");
    assertThat(propertyDefinition.type().toString()).isEqualTo("BOOLEAN");
    assertThat(propertyDefinition.defaultValue()).isEqualTo("false");
    assertThat(propertyDefinition.category()).isEqualTo("JavaScript / TypeScript");
    assertThat(propertyDefinition.subCategory()).isEqualTo("TypeScript");
  }

  private List<PropertyDefinition> properties() {
    var extensions = setupContext(
      SonarRuntimeImpl.forSonarQube(LTS_VERSION, SonarQubeSide.SERVER, SonarEdition.COMMUNITY)
    ).getExtensions();

    return extensions
      .stream()
      .filter(extension -> {
        return extension instanceof PropertyDefinition;
      })
      .toList();
  }

  private Plugin.Context setupContext(SonarRuntime runtime) {
    Plugin.Context context = new Plugin.Context(runtime);
    new JavaScriptPlugin().define(context);
    return context;
  }
}
