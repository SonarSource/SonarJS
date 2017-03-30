/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2017 SonarSource SA
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
package com.sonar.javascript.it.plugin;

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.SonarScanner;
import com.sonar.orchestrator.locator.FileLocation;
import java.io.File;
import java.util.List;
import javax.annotation.CheckForNull;
import org.junit.ClassRule;
import org.junit.runner.RunWith;
import org.junit.runners.Suite;
import org.sonarqube.ws.WsMeasures;
import org.sonarqube.ws.WsMeasures.Measure;
import org.sonarqube.ws.client.HttpConnector;
import org.sonarqube.ws.client.WsClient;
import org.sonarqube.ws.client.WsClientFactories;
import org.sonarqube.ws.client.measure.ComponentWsRequest;

import static java.util.Collections.singletonList;

@RunWith(Suite.class)
@Suite.SuiteClasses({
  BigProjectTest.class,
  CoverageTest.class,
  CustomRulesTests.class,
  MetricsTest.class,
  MinifiedFilesTest.class,
  SonarLintTest.class
})
public final class Tests {

  private static final String CUSTOM_RULES_ARTIFACT_ID = "javascript-custom-rules-plugin";

  public static final String PROJECT_KEY = "project";

  public static final FileLocation JAVASCRIPT_PLUGIN_LOCATION = FileLocation.byWildcardMavenFilename(
    new File("../../../sonar-javascript-plugin/target"), "sonar-javascript-plugin-*.jar");

  @ClassRule
  public static final Orchestrator ORCHESTRATOR = Orchestrator.builderEnv()
    .addPlugin(JAVASCRIPT_PLUGIN_LOCATION)
    .restoreProfileAtStartup(FileLocation.ofClasspath("/empty-profile.xml"))
    .addPlugin(FileLocation.byWildcardMavenFilename(
      new File("../plugins/" + CUSTOM_RULES_ARTIFACT_ID + "/target"), CUSTOM_RULES_ARTIFACT_ID + "-*.jar"))
    .restoreProfileAtStartup(FileLocation.ofClasspath("/profile-javascript-custom-rules.xml"))
    .build();

  private Tests() {
  }

  public static SonarScanner createScanner() {
    SonarScanner scanner = SonarScanner.create();
    scanner.setProperty("sonar.exclusions", "**/ecmascript6/**, **/file-for-rules/**, **/frameworks/**");
    scanner.setSourceEncoding("UTF-8");

    return scanner;
  }

  public static void setEmptyProfile(String projectKey, String projectName) {
    ORCHESTRATOR.getServer().provisionProject(projectKey, projectName);
    ORCHESTRATOR.getServer().associateProjectToQualityProfile(projectKey, "js", "empty-profile");
  }

  public static boolean is_before_sonar_6_2() {
    return !ORCHESTRATOR.getConfiguration().getSonarVersion().isGreaterThanOrEquals("6.2");
  }

  @CheckForNull
  static Measure getMeasure(String componentKey, String metricKey) {
    WsMeasures.ComponentWsResponse response = newWsClient().measures().component(new ComponentWsRequest()
      .setComponentKey(componentKey)
      .setMetricKeys(singletonList(metricKey)));
    List<Measure> measures = response.getComponent().getMeasuresList();
    return measures.size() == 1 ? measures.get(0) : null;
  }

  @CheckForNull
  static Integer getMeasureAsInt(String componentKey, String metricKey) {
    Measure measure = getMeasure(componentKey, metricKey);
    return (measure == null) ? null : Integer.parseInt(measure.getValue());
  }

  @CheckForNull
  static Double getMeasureAsDouble(String componentKey, String metricKey) {
    Measure measure = getMeasure(componentKey, metricKey);
    return (measure == null) ? null : Double.parseDouble(measure.getValue());
  }

  static WsClient newWsClient() {
    return WsClientFactories.getDefault().newClient(HttpConnector.newBuilder()
      .url(ORCHESTRATOR.getServer().getUrl())
      .build());
  }

}
