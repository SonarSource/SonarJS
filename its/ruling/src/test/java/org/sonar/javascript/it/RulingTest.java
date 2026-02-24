/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2025 SonarSource Sàrl
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
package org.sonar.javascript.it;

import static org.assertj.core.api.Assertions.assertThat;

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.SonarScanner;
import com.sonar.orchestrator.build.SonarScannerInstaller;
import com.sonar.orchestrator.container.Edition;
import com.sonar.orchestrator.container.Server;
import com.sonar.orchestrator.junit5.OrchestratorExtension;
import com.sonar.orchestrator.locator.FileLocation;
import com.sonar.orchestrator.locator.MavenLocation;
import com.sonar.orchestrator.util.Version;
import java.io.File;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.extension.RegisterExtension;
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

class RulingTest {

  private static final Logger LOG = LoggerFactory.getLogger(RulingTest.class);
  static final String LITS_VERSION = "0.11.0.2659";
  static final String SCANNER_VERSION = "5.0.1.3006";

  static final String DEFAULT_EXCLUSIONS = "**/.*,**/*.d.ts";

  @RegisterExtension
  public static final OrchestratorExtension orchestrator = OrchestratorExtension.builderEnv()
    .useDefaultAdminCredentialsForBuilds(true)
    .setEdition(Edition.ENTERPRISE_LW)
    .activateLicense()
    .setSonarVersion(System.getProperty("sonar.runtimeVersion", "LATEST_RELEASE"))
    .addPlugin(
      FileLocation.byWildcardMavenFilename(
        new File("../../sonar-plugin/sonar-javascript-plugin/target"),
        "sonar-javascript-plugin-*-multi.jar"
      )
    )
    .addPlugin(
      MavenLocation.of("org.sonarsource.sonar-lits-plugin", "sonar-lits-plugin", LITS_VERSION)
    )
    // required to load YAML files
    .addPlugin(MavenLocation.of("org.sonarsource.config", "sonar-config-plugin", "LATEST_RELEASE"))
    .addPlugin(MavenLocation.of("org.sonarsource.html", "sonar-html-plugin", "LATEST_RELEASE"))
    .build();

  public static Stream<Arguments> ruling() {
    return Stream.of(
      project("amplify", "external/**", "test"),
      project("angular.js", "src/ngLocale/**, i18n/**", "test"),
      project("backbone", "test"),
      project("es5-shim", "tests"),
      project("fireact"),
      project("ace"),
      project("ecmascript6-today"),
      project("expressionist.js"),
      project("Ghost"),
      project("http"),
      project("reddit-mobile"),
      project("redux"),
      project("router"),
      project("snoode"),
      project("sonar-web"),
      project("templating"),
      project("watchtower.js"),
      project("jira-clone"),
      project("TypeScript", "src/harness/unittests"),
      project("jquery", "test"),
      project("jshint", "tests"),
      project("jStorage", "tests"),
      project("knockout", "spec"),
      project("mootools-core", "Specs"),
      project("ocanvas", "build/**", ""),
      project("p5.js", "test"),
      project("paper.js", "gulp/jsdoc/**, packages/**", "test"),
      project("prototype", "test"),
      project("qunit", "test"),
      project("react-cloud-music"),
      project("sizzle", "external/**", "test"),
      project("underscore", "test"),
      project("ag-grid", "spec"),
      project("ant-design", "tests"), // todo: many dirs **/__tests__
      project("console"), // todo: many dirs **/__tests__
      project("courselit", ".yarn/**", ""),
      project("desktop", "app/test"),
      project("eigen"), // todo
      project("fireface"),
      project("ionic2-auth"),
      project("Joust"), // todo: files **/*.spec.ts
      project("moose"),
      project("postgraphql"), // todo: many dirs **/__tests__
      project("prettier-vscode"),
      project("rxjs", "spec"),
      project("searchkit"), // todo
      project("vuetify"),
      project("it-tools"),
      project("custom-yaml", "../sources/custom/yaml", "", ""),
      project("custom-jsts", "../sources/custom/jsts", "", "tests"),
      project("animate.css"),
      project("bulma"),
      project("normalize.css"),
      project("tailwindcss"),
      project("custom-css", "../sources/custom/css", "", "")
    );
  }

  private static Arguments project(String project) {
    return project(project, "", "");
  }

  private static Arguments project(String project, String testDir) {
    return project(project, "", testDir);
  }

  private static Arguments project(String project, String exclusions, String testDir) {
    return project(project, "../sources/projects/" + project, exclusions, testDir);
  }

  private static Arguments project(
    String project,
    String folder,
    String exclusions,
    String testDir
  ) {
    return Arguments.of(project, folder, exclusions, testDir);
  }

  @BeforeAll
  public static void setUp() throws Exception {
    cleanRootNodeModules();
    ProfileGenerator.RulesConfiguration jsRulesConfiguration =
      new ProfileGenerator.RulesConfiguration()
        .add(
          "S1451",
          "headerFormat",
          "// Copyright 20\\d\\d The Closure Library Authors. All Rights Reserved."
        )
        .add("S1451", "isRegularExpression", "true")
        // to test parameters for eslint-based rules
        .add("S1192", "threshold", "4");

    ProfileGenerator.RulesConfiguration tsRulesConfiguration =
      new ProfileGenerator.RulesConfiguration()
        // should be no issue only on files starting with a single-line comment
        .add("S1451", "headerFormat", "//.*")
        .add("S1451", "isRegularExpression", "true");
    Set<String> excludedRules = Collections.singleton("S124");
    File jsProfile = ProfileGenerator.generateProfile(
      orchestrator.getServer().getUrl(),
      "js",
      "javascript",
      jsRulesConfiguration,
      excludedRules
    );
    File tsProfile = ProfileGenerator.generateProfile(
      orchestrator.getServer().getUrl(),
      "ts",
      "typescript",
      tsRulesConfiguration,
      new HashSet<>()
    );
    File cssProfile = ProfileGenerator.generateProfile(
      orchestrator.getServer().getUrl(),
      "css",
      "css",
      new ProfileGenerator.RulesConfiguration(),
      Collections.emptySet()
    );

    orchestrator
      .getServer()
      .restoreProfile(FileLocation.of(jsProfile))
      .restoreProfile(FileLocation.of(tsProfile))
      .restoreProfile(FileLocation.of(cssProfile))
      .restoreProfile(FileLocation.ofClasspath("/empty-html-profile.xml"));

    instantiateTemplateRule(
      "js",
      "rules",
      "S124",
      "CommentRegexTest",
      "regularExpression=\".*TODO.*\";message=\"bad user\";flags=\"i\""
    );

    instantiateTemplateRule(
      "ts",
      "rules",
      "S124",
      "CommentRegexTestTS",
      "regularExpression=\".*TODO.*\";message=\"bad user\";flags=\"i\""
    );

    // install scanner before jobs to avoid race condition when unzipping in parallel
    installScanner();
  }

  /**
   * Method to remove SonarJS root node_modules to avoid typescript picking up typings from SonarJS,
   * as they are not available during CI and the results with and without node_modules are different.
   *
   * @throws IOException
   */
  private static void cleanRootNodeModules() throws IOException {
    var nodeModules = Path.of("../../node_modules");
    if (Files.exists(nodeModules)) {
      var start = System.currentTimeMillis();
      LOG.info("Cleaning node_modules");
      try (var dirStream = Files.walk(nodeModules)) {
        dirStream.sorted(Comparator.reverseOrder()).forEachOrdered(RulingTest::deleteUnchecked);
      }
      LOG.info("Done cleaning node_modules in {}ms", System.currentTimeMillis() - start);
    }
  }

  private static void deleteUnchecked(Path path) {
    try {
      Files.delete(path);
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  private static void installScanner() {
    var installer = new SonarScannerInstaller(orchestrator.getLocators());
    installer.install(Version.create(SCANNER_VERSION), Path.of("target").toFile());
  }

  @ParameterizedTest
  @MethodSource
  @Execution(ExecutionMode.CONCURRENT)
  void ruling(String project, String sourceDir, String exclusions, String testDir)
    throws Exception {
    runRulingTest(project, sourceDir, exclusions, testDir);
  }

  static void runRulingTest(String projectKey, String sources, String exclusions, String testDir)
    throws IOException {
    orchestrator.getServer().provisionProject(projectKey, projectKey);
    orchestrator.getServer().associateProjectToQualityProfile(projectKey, "js", "rules");
    orchestrator.getServer().associateProjectToQualityProfile(projectKey, "ts", "rules");
    orchestrator.getServer().associateProjectToQualityProfile(projectKey, "css", "rules");
    orchestrator.getServer().associateProjectToQualityProfile(projectKey, "web", "empty-profile");

    File sourcesLocation = FileLocation.of(sources).getFile();

    String actualExclusions = DEFAULT_EXCLUSIONS;
    if (!exclusions.equals("")) {
      actualExclusions += "," + exclusions;
    }
    if (!testDir.equals("")) {
      actualExclusions += "," + testDir + "/**/*";
    }

    var differencesPath = Path.of("target", projectKey + "-differences").toAbsolutePath();
    SonarScanner build = SonarScanner.create(sourcesLocation)
      .setProjectKey(projectKey)
      .setProjectName(projectKey)
      .setProjectVersion("1")
      .setSourceDirs("./")
      .setTestDirs(testDir)
      .setSourceEncoding("utf-8")
      .setScannerVersion(SCANNER_VERSION)
      .setProperty(
        "sonar.lits.dump.old",
        FileLocation.of("src/test/expected/" + projectKey).getFile().getAbsolutePath()
      )
      .setProperty(
        "sonar.lits.dump.new",
        FileLocation.of("target/actual/" + projectKey).getFile().getAbsolutePath()
      )
      .setProperty("sonar.lits.differences", differencesPath.toString())
      .setProperty("sonar.exclusions", actualExclusions)
      .setProperty("sonar.javascript.node.maxspace", "4096")
      .setProperty("sonar.javascript.maxFileSize", "4000")
      .setProperty("sonar.cpd.exclusions", "**/*")
      .setProperty("sonar.internal.analysis.failFast", "true");

    orchestrator.executeBuild(build);
    assertThat(differencesPath).hasContent("");
  }

  private static void instantiateTemplateRule(
    String language,
    String qualityProfile,
    String ruleTemplateKey,
    String instantiationKey,
    String params
  ) {
    String keyPrefix = "ts".equals(language) ? "typescript:" : "javascript:";
    newAdminWsClient(orchestrator)
      .rules()
      .create(
        new CreateRequest()
          .setName(instantiationKey)
          .setMarkdownDescription(instantiationKey)
          .setSeverity("INFO")
          .setStatus("READY")
          .setTemplateKey(keyPrefix + ruleTemplateKey)
          .setCustomKey(instantiationKey)
          .setPreventReactivation("true")
          .setParams(
            Arrays.asList(
              (
                "name=\"" +
                instantiationKey +
                "\";key=\"" +
                instantiationKey +
                "\";markdown_description=\"" +
                instantiationKey +
                "\";" +
                params
              ).split(";", 0)
            )
          )
      );

    String profileKey = newAdminWsClient(orchestrator)
      .qualityprofiles()
      .search(new SearchRequest().setLanguage(language))
      .getProfilesList()
      .stream()
      .filter(qp -> qualityProfile.equals(qp.getName()))
      .map(Qualityprofiles.SearchWsResponse.QualityProfile::getKey)
      .findFirst()
      .orElse(null);

    if (profileKey != null && !profileKey.isEmpty()) {
      newAdminWsClient(orchestrator)
        .qualityprofiles()
        .activateRule(
          new ActivateRuleRequest()
            .setKey(profileKey)
            .setRule(keyPrefix + instantiationKey)
            .setSeverity("INFO")
            .setParams(Collections.emptyList())
        );
      LOG.warn(
        String.format("Successfully activated template rule '%s'", keyPrefix + instantiationKey)
      );
    } else {
      throw new IllegalStateException(
        "Could not retrieve profile key : Template rule " +
          ruleTemplateKey +
          " has not been activated"
      );
    }
  }

  static WsClient newAdminWsClient(Orchestrator orchestrator) {
    return WsClientFactories.getDefault().newClient(
      HttpConnector.newBuilder()
        .credentials(Server.ADMIN_LOGIN, Server.ADMIN_PASSWORD)
        .url(orchestrator.getServer().getUrl())
        .build()
    );
  }
}
