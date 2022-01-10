/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2022 SonarSource SA
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
import com.sonar.orchestrator.locator.MavenLocation;
import java.io.File;
import java.util.List;
import javax.annotation.CheckForNull;
import org.junit.jupiter.api.extension.BeforeAllCallback;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.sonarqube.ws.Issues.Issue;
import org.sonarqube.ws.Measures.ComponentWsResponse;
import org.sonarqube.ws.Measures.Measure;
import org.sonarqube.ws.client.HttpConnector;
import org.sonarqube.ws.client.WsClient;
import org.sonarqube.ws.client.WsClientFactories;
import org.sonarqube.ws.client.issues.SearchRequest;
import org.sonarqube.ws.client.measures.ComponentRequest;

import static java.util.Collections.singletonList;
import static org.junit.jupiter.api.extension.ExtensionContext.Namespace.GLOBAL;

public final class OrchestratorStarter implements BeforeAllCallback, ExtensionContext.Store.CloseableResource {

  static final FileLocation JAVASCRIPT_PLUGIN_LOCATION = FileLocation.byWildcardMavenFilename(
    new File("../../../sonar-javascript-plugin/target"), "sonar-javascript-plugin-*.jar");

  public static final Orchestrator ORCHESTRATOR = Orchestrator.builderEnv()
    .setSonarVersion(System.getProperty("sonar.runtimeVersion", "LATEST_RELEASE"))
    .addPlugin(MavenLocation.of("org.sonarsource.php", "sonar-php-plugin", "LATEST_RELEASE"))
    .addPlugin(MavenLocation.of("org.sonarsource.html", "sonar-html-plugin", "LATEST_RELEASE"))
    .addPlugin(JAVASCRIPT_PLUGIN_LOCATION)
    .restoreProfileAtStartup(FileLocation.ofClasspath("/empty-js-profile.xml"))
    .restoreProfileAtStartup(FileLocation.ofClasspath("/empty-ts-profile.xml"))
    .restoreProfileAtStartup(FileLocation.ofClasspath("/profile-javascript-custom-rules.xml"))
    .restoreProfileAtStartup(FileLocation.ofClasspath("/nosonar.xml"))
    .restoreProfileAtStartup(FileLocation.ofClasspath("/eslint-based-rules.xml"))
    .restoreProfileAtStartup(FileLocation.ofClasspath("/ts-eslint-based-rules.xml"))
    .restoreProfileAtStartup(FileLocation.ofClasspath("/js-with-ts-eslint-profile.xml"))
    .build();

  private static boolean started;

  private OrchestratorStarter() {
  }

  @Override
  public void beforeAll(ExtensionContext context) throws Exception {
    if (!started) {
      started = true;
      // this will register "this.close()" method to be called when GLOBAL context is shutdown
      context.getRoot().getStore(GLOBAL).put(OrchestratorStarter.class, this);
      ORCHESTRATOR.start();
    }
  }


  @Override
  public void close() throws Throwable {
    // this is executed once all tests are finished
    ORCHESTRATOR.stop();
  }

  public static SonarScanner createScanner() {
    SonarScanner scanner = SonarScanner.create();
    scanner.setProperty("sonar.exclusions", "**/ecmascript6/**, **/file-for-rules/**, **/frameworks/**, **/jest/**/*, **/babylon/**/*");
    scanner.setSourceEncoding("UTF-8");

    return scanner;
  }

  public static void setEmptyProfile(String projectKey) {
    ORCHESTRATOR.getServer().provisionProject(projectKey, projectKey);
    ORCHESTRATOR.getServer().associateProjectToQualityProfile(projectKey, "ts", "empty-profile");
    ORCHESTRATOR.getServer().associateProjectToQualityProfile(projectKey, "js", "empty-profile");
  }

  public static void setProfile(String projectKey, String profileName, String language) {
    ORCHESTRATOR.getServer().provisionProject(projectKey, projectKey);
    ORCHESTRATOR.getServer().associateProjectToQualityProfile(projectKey, language, profileName);
  }

  @CheckForNull
  static Measure getMeasure(String componentKey, String metricKey) {
    ComponentWsResponse response = newWsClient(ORCHESTRATOR).measures().component(new ComponentRequest()
      .setComponent(componentKey)
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

  static WsClient newWsClient(Orchestrator orchestrator) {
    return WsClientFactories.getDefault().newClient(HttpConnector.newBuilder()
      .url(orchestrator.getServer().getUrl())
      .build());
  }

  static List<Issue> getIssues(String componentKey) {
    SearchRequest request = new SearchRequest();
    request.setComponentKeys(singletonList(componentKey));
    return newWsClient(ORCHESTRATOR).issues().search(request).getIssuesList();
  }


}
