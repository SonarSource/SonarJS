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
package com.sonar.javascript.it.plugin;

import static java.util.Collections.singletonList;
import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.extension.ExtensionContext.Namespace.GLOBAL;

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.SonarScanner;
import com.sonar.orchestrator.junit5.OrchestratorExtension;
import com.sonar.orchestrator.locator.FileLocation;
import com.sonar.orchestrator.locator.MavenLocation;
import com.sonar.orchestrator.locator.URLLocation;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import javax.annotation.CheckForNull;
import org.junit.jupiter.api.extension.BeforeAllCallback;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.sonarqube.ws.Issues.Issue;
import org.sonarqube.ws.Measures.Measure;
import org.sonarqube.ws.client.HttpConnector;
import org.sonarqube.ws.client.WsClient;
import org.sonarqube.ws.client.WsClientFactories;
import org.sonarqube.ws.client.issues.SearchRequest;
import org.sonarqube.ws.client.measures.ComponentRequest;

public final class OrchestratorStarter
  implements BeforeAllCallback, ExtensionContext.Store.CloseableResource {

  static final String SCANNER_VERSION = "5.0.1.3006";

  static final URLLocation JAVASCRIPT_PLUGIN_LOCATION = artifact();

  /**
   * This is used to test artifact with and without embedded runtime during plugin QA integration tests
   *
   */
  private static URLLocation artifact() {
    var target = Path.of("../../../sonar-plugin/sonar-javascript-plugin/target");
    try (var stream = Files.walk(target, 1)) {
      var plugin = stream
        .filter(p -> pluginFilenameMatcher().matcher(p.getFileName().toString()).matches())
        .findAny()
        .orElseThrow();
      return URLLocation.create(plugin.toUri().toURL());
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  private static Pattern pluginFilenameMatcher() {
    return "multi".equals(System.getenv("SONARJS_ARTIFACT"))
      ? Pattern.compile("sonar-javascript-plugin-.*-multi\\.jar")
      : Pattern.compile("sonar-javascript-plugin-[0-9.]*(?:-SNAPSHOT)?\\.jar");
  }

  public static final OrchestratorExtension ORCHESTRATOR = OrchestratorExtension
    .builderEnv()
    .useDefaultAdminCredentialsForBuilds(true)
    .setSonarVersion(System.getProperty("sonar.runtimeVersion", "LATEST_RELEASE"))
    .addPlugin(MavenLocation.of("org.sonarsource.php", "sonar-php-plugin", "LATEST_RELEASE"))
    .addPlugin(MavenLocation.of("org.sonarsource.html", "sonar-html-plugin", "LATEST_RELEASE"))
    // required to load YAML files
    .addPlugin(MavenLocation.of("org.sonarsource.config", "sonar-config-plugin", "LATEST_RELEASE"))
    .addPlugin(JAVASCRIPT_PLUGIN_LOCATION)
    .restoreProfileAtStartup(FileLocation.ofClasspath("/empty-js-profile.xml"))
    .restoreProfileAtStartup(FileLocation.ofClasspath("/empty-ts-profile.xml"))
    .restoreProfileAtStartup(FileLocation.ofClasspath("/profile-javascript-custom-rules.xml"))
    .restoreProfileAtStartup(FileLocation.ofClasspath("/nosonar.xml"))
    .restoreProfileAtStartup(FileLocation.ofClasspath("/eslint-based-rules.xml"))
    .restoreProfileAtStartup(FileLocation.ofClasspath("/ts-eslint-based-rules.xml"))
    .restoreProfileAtStartup(FileLocation.ofClasspath("/js-with-ts-eslint-profile.xml"))
    .restoreProfileAtStartup(FileLocation.ofClasspath("/html-profile.xml"))
    .restoreProfileAtStartup(FileLocation.ofClasspath("/html-blacklist-profile.xml"))
    .restoreProfileAtStartup(FileLocation.ofClasspath("/typechecker-config-js.xml"))
    .restoreProfileAtStartup(FileLocation.ofClasspath("/typechecker-config-ts.xml"))
    .restoreProfileAtStartup(FileLocation.ofClasspath("/resolve-json-module-profile.xml"))
    .build();

  private static volatile boolean started;

  private OrchestratorStarter() {}

  /**
   * make sure that whole test suite uses the same version of the scanner
   */
  static SonarScanner getSonarScanner() {
    return SonarScanner.create().setScannerVersion(SCANNER_VERSION);
  }

  @Override
  public void beforeAll(ExtensionContext context) {
    synchronized (OrchestratorStarter.class) {
      if (!started) {
        started = true;
        // this will register "this.close()" method to be called when GLOBAL context is shutdown
        context.getRoot().getStore(GLOBAL).put(OrchestratorStarter.class, this);
        ORCHESTRATOR.start();

        // to avoid a race condition in scanner file cache mechanism we analyze single project before any test to populate the cache
        testProject();
      }
    }
  }

  @Override
  public void close() {
    // this is executed once all tests are finished
    ORCHESTRATOR.stop();
  }

  public static SonarScanner createScanner() {
    SonarScanner scanner = getSonarScanner();
    scanner.setProperty(
      "sonar.exclusions",
      "**/ecmascript6/**, **/file-for-rules/**, **/frameworks/**, **/jest/**/*, **/babylon/**/*"
    );
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

  public static void setProfiles(String projectKey, Map<String, String> profiles) {
    setProfiles(ORCHESTRATOR, projectKey, profiles);
  }

  static void setProfiles(
    Orchestrator orchestrator,
    String projectKey,
    Map<String, String> profiles
  ) {
    orchestrator.getServer().provisionProject(projectKey, projectKey);
    profiles.forEach((profileName, language) ->
      orchestrator.getServer().associateProjectToQualityProfile(projectKey, language, profileName)
    );
  }

  @CheckForNull
  static Measure getMeasure(String componentKey, String metricKey) {
    return getMeasure(ORCHESTRATOR, componentKey, metricKey, null, null);
  }

  @CheckForNull
  private static Measure getMeasure(
    Orchestrator orchestrator,
    String componentKey,
    String metricKey,
    String branch,
    String pullRequest
  ) {
    var request = new ComponentRequest()
      .setComponent(componentKey)
      .setMetricKeys(singletonList(metricKey));
    if (branch != null) {
      request.setBranch(branch);
    }
    if (pullRequest != null) {
      request.setPullRequest(pullRequest);
    }
    var response = newWsClient(orchestrator).measures().component(request);
    var measures = response.getComponent().getMeasuresList();
    return measures.size() == 1 ? measures.get(0) : null;
  }

  @CheckForNull
  static Integer getMeasureAsInt(String componentKey, String metricKey) {
    Measure measure = getMeasure(componentKey, metricKey);
    return (measure == null) ? null : Integer.parseInt(measure.getValue());
  }

  @CheckForNull
  static Double getMeasureAsDouble(String componentKey, String metricKey) {
    return getMeasureAsDouble(ORCHESTRATOR, componentKey, metricKey, null, null);
  }

  @CheckForNull
  public static Double getMeasureAsDouble(
    Orchestrator orchestrator,
    String componentKey,
    String metricKey,
    String branch,
    String pullRequest
  ) {
    var measure = getMeasure(orchestrator, componentKey, metricKey, branch, pullRequest);
    return (measure == null) ? null : Double.parseDouble(measure.getValue());
  }

  static WsClient newWsClient(Orchestrator orchestrator) {
    return WsClientFactories
      .getDefault()
      .newClient(HttpConnector.newBuilder().url(orchestrator.getServer().getUrl()).build());
  }

  static List<Issue> getIssues(String componentKey) {
    return getIssues(ORCHESTRATOR, componentKey, null, null);
  }

  static List<Issue> getIssues(
    Orchestrator orchestrator,
    String componentKey,
    String branch,
    String pullRequest
  ) {
    SearchRequest request = new SearchRequest();
    request.setComponentKeys(singletonList(componentKey));
    if (branch != null) {
      request.setBranch(branch);
    }
    if (pullRequest != null) {
      request.setPullRequest(pullRequest);
    }
    return newWsClient(orchestrator).issues().search(request).getIssuesList();
  }

  private static void testProject() {
    var projectKey = "eslint_based_rules";
    var projectDir = TestUtils.projectDir(projectKey);
    var build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(projectDir);
    OrchestratorStarter.setProfile(projectKey, "empty-profile", "js");

    var buildResult = ORCHESTRATOR.executeBuild(build);
    assertThat(buildResult.isSuccess()).isTrue();
    assertThat(buildResult.getLogsLines(l -> l.startsWith("ERROR"))).isEmpty();
  }
}
