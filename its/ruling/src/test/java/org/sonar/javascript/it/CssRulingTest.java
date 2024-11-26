/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2024 SonarSource SA
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

import static java.nio.charset.StandardCharsets.UTF_8;
import static org.assertj.core.api.Assertions.assertThat;
import static org.sonar.javascript.it.JsTsRulingTest.LITS_VERSION;

import com.sonar.orchestrator.build.SonarScanner;
import com.sonar.orchestrator.junit5.OrchestratorExtension;
import com.sonar.orchestrator.locator.FileLocation;
import com.sonar.orchestrator.locator.MavenLocation;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.Collections;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.sonarsource.analyzer.commons.ProfileGenerator;

class CssRulingTest {

  private static final String SQ_VERSION_PROPERTY = "sonar.runtimeVersion";
  private static final String DEFAULT_SQ_VERSION = "LATEST_RELEASE";
  private static final String PROJECT_KEY = "project";

  @RegisterExtension
  public static final OrchestratorExtension ORCHESTRATOR = OrchestratorExtension
    .builderEnv()
    .useDefaultAdminCredentialsForBuilds(true)
    .setSonarVersion(System.getProperty(SQ_VERSION_PROPERTY, DEFAULT_SQ_VERSION))
    .addPlugin(MavenLocation.of("org.sonarsource.php", "sonar-php-plugin", "LATEST_RELEASE"))
    .addPlugin(MavenLocation.of("org.sonarsource.html", "sonar-html-plugin", "LATEST_RELEASE"))
    .addPlugin(
      FileLocation.byWildcardMavenFilename(
        new File("../../sonar-plugin/sonar-javascript-plugin/target"),
        "sonar-javascript-plugin-*-multi.jar"
      )
    )
    .addPlugin(
      MavenLocation.of("org.sonarsource.sonar-lits-plugin", "sonar-lits-plugin", LITS_VERSION)
    )
    .build();

  @BeforeAll
  public static void prepare_quality_profile() throws IOException {
    ProfileGenerator.RulesConfiguration parameters = new ProfileGenerator.RulesConfiguration();
    String serverUrl = ORCHESTRATOR.getServer().getUrl();
    File profileFile = ProfileGenerator.generateProfile(
      serverUrl,
      "css",
      "css",
      parameters,
      Collections.emptySet()
    );
    ORCHESTRATOR.getServer().restoreProfile(FileLocation.of(profileFile));
    loadEmptyProfile("php");
    loadEmptyProfile("web");
    loadEmptyProfile("js");
    loadEmptyProfile("ts");
  }

  private static void loadEmptyProfile(String language) throws IOException {
    String profile = profile(language);
    File file = File.createTempFile("profile", ".xml");
    Files.write(file.toPath(), profile.getBytes());
    ORCHESTRATOR.getServer().restoreProfile(FileLocation.of(file));
    file.delete();
  }

  private static String profile(String language) {
    return (
      "<profile>" +
      "<name>rules</name>" +
      "<language>" +
      language +
      "</language>" +
      "<rules></rules>" +
      "</profile>"
    );
  }

  @Test
  void test() throws Exception {
    ORCHESTRATOR.getServer().provisionProject(PROJECT_KEY, PROJECT_KEY);
    ORCHESTRATOR.getServer().associateProjectToQualityProfile(PROJECT_KEY, "css", "rules");
    ORCHESTRATOR.getServer().associateProjectToQualityProfile(PROJECT_KEY, "php", "rules");
    ORCHESTRATOR.getServer().associateProjectToQualityProfile(PROJECT_KEY, "web", "rules");
    ORCHESTRATOR.getServer().associateProjectToQualityProfile(PROJECT_KEY, "js", "rules");
    ORCHESTRATOR.getServer().associateProjectToQualityProfile(PROJECT_KEY, "ts", "rules");
    File litsDifferencesFile = FileLocation.of("target/differences").getFile();
    SonarScanner build = SonarScanner
      .create(FileLocation.of("../sources/css").getFile())
      .setProjectKey(PROJECT_KEY)
      .setProjectName(PROJECT_KEY)
      .setProjectVersion("1")
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProperty(
        "sonar.lits.dump.old",
        FileLocation.of("src/test/expected/css").getFile().getAbsolutePath()
      )
      .setProperty(
        "sonar.lits.dump.new",
        FileLocation.of("target/actual/css").getFile().getAbsolutePath()
      )
      .setProperty("sonar.cpd.exclusions", "**/*")
      .setProperty("sonar.lits.differences", litsDifferencesFile.getAbsolutePath())
      .setProperty("sonar.internal.analysis.failFast", "true")
      .setEnvironmentVariable("SONAR_RUNNER_OPTS", "-Xmx2000m");
    ORCHESTRATOR.executeBuild(build);

    String litsDifferences = Files.readString(litsDifferencesFile.toPath());
    assertThat(litsDifferences).isEmpty();
  }
}
