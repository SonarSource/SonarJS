/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package com.sonar.javascript.it.plugin.sonarlint.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.JarURLConnection;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.xpath.XPathFactory;
import org.junit.jupiter.api.Test;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonarsource.sonarlint.core.plugin.commons.ApiVersions;

class SonarLintRuntimeApiTest {

  @Test
  void runtime_api_matches_sonarlint_core() throws Exception {
    var factory = DocumentBuilderFactory.newDefaultInstance();
    factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
    factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");

    try (var pom = SonarLintRuntimeApiTest.class.getResourceAsStream("/sonarlint-core-pom.xml")) {
      assertThat(pom).as("Published SonarLint Core POM copied by Maven").isNotNull();
      var document = factory.newDocumentBuilder().parse(pom);
      var xpath = XPathFactory.newDefaultInstance().newXPath();
      var coreVersion = xpath.evaluate("/project/version", document);
      var expectedApiVersion = xpath.evaluate(
        "/project/properties/sonar-plugin-api.version",
        document
      );
      assertThat(expectedApiVersion)
        .as("Sonar API version declared by SonarLint Core %s", coreVersion)
        .isNotBlank()
        .doesNotContain("${");

      var actualApiVersion = ApiVersions.loadSonarPluginApiVersion().toString();
      var apiLocation = SensorContext.class.getProtectionDomain().getCodeSource().getLocation();
      System.out.printf(
        "SQ-IDE QA: SonarLint Core %s expects Sonar API %s; runtime API %s loaded from %s%n",
        coreVersion,
        expectedApiVersion,
        actualApiVersion,
        apiLocation
      );
      assertThat(actualApiVersion)
        .as("Sonar API provided by SonarLint Core %s, loaded from %s", coreVersion, apiLocation)
        .isEqualTo(expectedApiVersion);

      var versionResource = ApiVersions.class.getResource("/sonar-api-version.txt");
      assertThat(versionResource).isNotNull();
      var versionConnection = versionResource.openConnection();
      assertThat(versionConnection).isInstanceOf(JarURLConnection.class);
      assertThat(((JarURLConnection) versionConnection).getJarFileURL())
        .as("Sonar API classes and version metadata must come from the same JAR")
        .isEqualTo(apiLocation);
    }
  }
}
