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
package org.sonar.javascript.it;

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.SonarScanner;
import com.sonar.orchestrator.build.SonarScannerInstaller;
import com.sonar.orchestrator.container.Server;
import com.sonar.orchestrator.locator.FileLocation;
import com.sonar.orchestrator.locator.MavenLocation;
import com.sonar.orchestrator.version.Version;
import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Stream;
import org.apache.commons.lang.StringUtils;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonarqube.ws.Qualityprofiles;
import org.sonarqube.ws.client.HttpConnector;
import org.sonarqube.ws.client.WsClient;
import org.sonarqube.ws.client.WsClientFactories;
import org.sonarqube.ws.client.qualityprofiles.ActivateRuleRequest;
import org.sonarqube.ws.client.qualityprofiles.SearchRequest;
import org.sonarqube.ws.client.rules.CreateRequest;
import org.sonarsource.analyzer.commons.ProfileGenerator;

import static org.assertj.core.api.Assertions.assertThat;

class JavaScriptRulingTest {

  private static final Logger LOG = LoggerFactory.getLogger(JavaScriptRulingTest.class);
  static final String LITS_VERSION = "0.10.0.2181";
  static final String SCANNER_VERSION = "4.7.0.2747";

  public static final Orchestrator orchestrator = Orchestrator.builderEnv()
    .useDefaultAdminCredentialsForBuilds(true)
    .setSonarVersion(System.getProperty("sonar.runtimeVersion", "LATEST_RELEASE"))
    .addPlugin(FileLocation.byWildcardMavenFilename(
      new File("../../sonar-javascript-plugin/target"), "sonar-javascript-plugin-*.jar"))
    .addPlugin(MavenLocation.of("org.sonarsource.sonar-lits-plugin", "sonar-lits-plugin", LITS_VERSION))
    // required to load YAML files
    .addPlugin(MavenLocation.of("org.sonarsource.config", "sonar-config-plugin", "LATEST_RELEASE"))
    .build();

  public static Stream<Arguments> ruling() {
    return Stream.of(
      jsProject("amplify", "external/**", "test"),
      jsProject("angular.js", "src/ngLocale/**, i18n/**", "test"),
      jsProject("backbone", "", "test"),
      jsProject("es5-shim", "", "tests"),
      jsProject("file-for-rules", "", "tests"),
      jsProject("fireact", "", ""),
      jsProject("javascript-test-sources", "", ""),
      jsProject("jira-clone", "", ""),
      jsProject("jquery", "", "test"),
      jsProject("jshint", "", "tests"),
      jsProject("jStorage", "", "tests"),
      jsProject("knockout", "", "spec"),
      jsProject("mootools-core", "", "Specs"),
      jsProject("ocanvas", "build/**", ""),
      jsProject("p5.js", "", "test"),
      jsProject("paper.js", "gulp/jsdoc/**, packages/**", "test"),
      jsProject("prototype", "", "test"),
      jsProject("qunit", "", "test"),
      jsProject("react-cloud-music", "", ""),
      jsProject("sizzle", "external/**", "test"),
      jsProject("underscore", "", "test"),
      jsProject("yaml", "", "")
    );
  }

  private static Arguments jsProject(String project, String exclusions, String testDir) {
    String exclusionList = "**/.*, **/*.ts, " + exclusions;
    return Arguments.of(project, "js", "../sources/" + project, exclusionList, testDir);
  }

  @BeforeAll
  public static void setUp() throws Exception {
    orchestrator.start();
    ProfileGenerator.RulesConfiguration jsRulesConfiguration = new ProfileGenerator.RulesConfiguration()
      .add("S1451", "headerFormat", "// Copyright 20\\d\\d The Closure Library Authors. All Rights Reserved.")
      .add("S1451", "isRegularExpression", "true")
      // to test parameters for eslint-based rules
      .add("S1192", "threshold", "4");

    ProfileGenerator.RulesConfiguration tsRulesConfiguration = new ProfileGenerator.RulesConfiguration()
      // should be no issue only on files starting with a single-line comment
      .add("S1451", "headerFormat", "//.*")
      .add("S1451", "isRegularExpression", "true");
    Set<String> excludedRules = Collections.singleton("S124");
    File jsProfile = ProfileGenerator.generateProfile(orchestrator.getServer().getUrl(), "js", "javascript", jsRulesConfiguration, excludedRules);
    File tsProfile = ProfileGenerator.generateProfile(
      orchestrator.getServer().getUrl(),
      "ts", "typescript",
      tsRulesConfiguration,
      new HashSet<>());

    orchestrator.getServer()
      .restoreProfile(FileLocation.of(jsProfile))
      .restoreProfile(FileLocation.of(tsProfile))
      .restoreProfile(FileLocation.ofClasspath("/empty-ts-profile.xml"))
      .restoreProfile(FileLocation.ofClasspath("/empty-js-profile.xml"))
      .restoreProfile(FileLocation.ofClasspath("/empty-css-profile.xml"));

    instantiateTemplateRule("js", "rules",
      "S124",
      "CommentRegexTest",
      "regularExpression=\".*TODO.*\";message=\"bad user\";flags=\"i\"");


    instantiateTemplateRule("ts", "rules",
      "S124",
      "CommentRegexTestTS",
      "regularExpression=\".*TODO.*\";message=\"bad user\";flags=\"i\"");

    // install scanner before jobs to avoid race condition when unzipping in parallel
    installScanner();
  }

  private static void installScanner() {
    var installer = new SonarScannerInstaller(orchestrator.getConfiguration().locators());
    installer.install(Version.create(SCANNER_VERSION), null, Path.of("target").toFile(), false);
  }

  @AfterAll
  static void afterAll() {
    orchestrator.stop();
  }

  @ParameterizedTest
  @MethodSource
  @Execution(ExecutionMode.CONCURRENT)
  void ruling(String project, String language, String sourceDir, String exclusions, String testDir) throws Exception {
    runRulingTest(project, language, sourceDir, exclusions, testDir);
  }

  static void runRulingTest(String projectKey, String languageToAnalyze, String sources, String exclusions, String testDir) throws IOException {
    String languageToIgnore = "js".equals(languageToAnalyze) ? "ts" : "js";
    orchestrator.getServer().provisionProject(projectKey, projectKey);
    orchestrator.getServer().associateProjectToQualityProfile(projectKey, languageToAnalyze, "rules");
    orchestrator.getServer().associateProjectToQualityProfile(projectKey, languageToIgnore, "empty-profile");
    orchestrator.getServer().associateProjectToQualityProfile(projectKey, "css", "empty-profile");

    File sourcesLocation = FileLocation.of(sources).getFile();

    String actualExclusions = exclusions;
    if (!testDir.equals("")) {
      actualExclusions += ", " + testDir + "/**/*";
    }

    var differencesPath = Path.of("target", languageToAnalyze + "-" + projectKey + "-differences").toAbsolutePath();
    SonarScanner build = SonarScanner.create(sourcesLocation)
      .setProjectKey(projectKey)
      .setProjectName(projectKey)
      .setProjectVersion("1")
      .setSourceDirs("./")
      .setTestDirs(testDir)
      .setSourceEncoding("utf-8")
      .setScannerVersion(SCANNER_VERSION)
      .setProperty("sonar.lits.dump.old", FileLocation.of("src/test/expected/" + languageToAnalyze + "/" + projectKey).getFile().getAbsolutePath())
      .setProperty("sonar.lits.dump.new", FileLocation.of("target/actual/" + languageToAnalyze + "/" + projectKey).getFile().getAbsolutePath())
      .setProperty("sonar.lits.differences", differencesPath.toString())
      .setProperty("sonar.exclusions", actualExclusions)
      .setProperty("sonar.javascript.node.maxspace", "2048")
      .setProperty("sonar.javascript.maxFileSize", "4000")
      .setProperty("sonar.cpd.exclusions", "**/*")
      .setProperty("sonar.internal.analysis.failFast", "true");

    orchestrator.executeBuild(build);
    assertThat(differencesPath).hasContent("");
  }

  private static void instantiateTemplateRule(String language, String qualityProfile, String ruleTemplateKey, String instantiationKey, String params) {
    String keyPrefix = "ts".equals(language) ? "typescript:" : "javascript:";
    newAdminWsClient(orchestrator)
      .rules()
      .create(new CreateRequest()
        .setName(instantiationKey)
        .setMarkdownDescription(instantiationKey)
        .setSeverity("INFO")
        .setStatus("READY")
        .setTemplateKey(keyPrefix + ruleTemplateKey)
        .setCustomKey(instantiationKey)
        .setPreventReactivation("true")
        .setParams(Arrays.asList(("name=\"" + instantiationKey + "\";key=\"" + instantiationKey + "\";markdown_description=\"" + instantiationKey + "\";" + params).split(";", 0))));


    String profileKey = newAdminWsClient(orchestrator).qualityprofiles()
      .search(new SearchRequest().setLanguage(language))
      .getProfilesList().stream()
      .filter(qp -> qualityProfile.equals(qp.getName()))
      .map(Qualityprofiles.SearchWsResponse.QualityProfile::getKey)
      .findFirst()
      .orElse(null);

    if (!StringUtils.isEmpty(profileKey)) {
      newAdminWsClient(orchestrator).qualityprofiles()
        .activateRule(new ActivateRuleRequest()
          .setKey(profileKey)
          .setRule(keyPrefix + instantiationKey)
          .setSeverity("INFO")
          .setParams(Collections.emptyList()));
      LOG.warn(String.format("Successfully activated template rule '%s'", keyPrefix + instantiationKey));
    } else {
      throw new IllegalStateException("Could not retrieve profile key : Template rule " + ruleTemplateKey + " has not been activated");
    }
  }

  static WsClient newAdminWsClient(Orchestrator orchestrator) {
    return WsClientFactories.getDefault().newClient(HttpConnector.newBuilder()
      .credentials(Server.ADMIN_LOGIN, Server.ADMIN_PASSWORD)
      .url(orchestrator.getServer().getUrl())
      .build());
  }

}
