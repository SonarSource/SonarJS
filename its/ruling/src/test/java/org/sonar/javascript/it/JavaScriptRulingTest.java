/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2020 SonarSource SA
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

import com.google.common.collect.ImmutableMap;
import com.google.gson.Gson;
import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.SonarScanner;
import com.sonar.orchestrator.locator.FileLocation;
import com.sonar.orchestrator.locator.MavenLocation;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.junit.BeforeClass;
import org.junit.ClassRule;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.Parameterized;
import org.junit.runners.Parameterized.Parameters;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.wsclient.SonarClient;
import org.sonarsource.analyzer.commons.ProfileGenerator;

import static org.assertj.core.api.Assertions.assertThat;

@RunWith(Parameterized.class)
public class JavaScriptRulingTest {

  private static final Logger LOG = LoggerFactory.getLogger(JavaScriptRulingTest.class);

  @ClassRule
  public static final Orchestrator orchestrator = Orchestrator.builderEnv()
    .setSonarVersion(System.getProperty("sonar.runtimeVersion", "LATEST_RELEASE[7.9]"))
    .addPlugin(FileLocation.byWildcardMavenFilename(
      new File("../../sonar-javascript-plugin/target"), "sonar-javascript-plugin-*.jar"))
    .addPlugin(MavenLocation.of("org.sonarsource.sonar-lits-plugin", "sonar-lits-plugin", "0.8.0.1209"))
    .build();


  String project;
  String language;
  String sourceDir;
  List<String> exclusions;

  public JavaScriptRulingTest(String project, String language, String sourceDir, List<String> exclusions) {
    this.project = project;
    this.language = language;
    this.sourceDir = sourceDir;
    this.exclusions = exclusions;
  }

  @Parameters(name = "{0}")
  public static Object[][] projects() {
    return new Object[][]{
      jsProject("amplify", "external/**"),
      jsProject("angular.js", "src/ngLocale/**", "i18n/**"),
      jsProject("backbone"),
      jsProject("es5-shim"),
      jsProject("javascript-test-sources"),
      jsProject("jquery"),
      jsProject("jshint", "dist/**", "tests/regression/**", "tests/test262/**"),
      jsProject("jStorage"),
      jsProject("knockout"),
      jsProject("mootools-core"),
      jsProject("ocanvas", "build/**"),
      jsProject("p5.js"),
      jsProject("paper.js", "dist/**", "gulp/jsdoc/**", "packages/**"),
      jsProject("prototype", "dist/**", "vendor/**"),
      jsProject("qunit"),
      jsProject("sizzle", "external/**", "dist/**"),
      jsProject("underscore", "test/vendor/**"),
    };
  }

  private static Object[] jsProject(String project, String... exclusions) {
    List<String> exclusionList = Stream.concat(Stream.of("**/.*", "**/*.ts"), Arrays.stream(exclusions))
      .collect(Collectors.toList());
    return new Object[]{project, "js", "../sources/" + project, exclusionList};
  }

  @BeforeClass
  public static void setUp() throws Exception {
    ProfileGenerator.RulesConfiguration jsRulesConfiguration = new ProfileGenerator.RulesConfiguration()
      .add("S1451", "headerFormat", "// Copyright 20\\d\\d The Closure Library Authors. All Rights Reserved.")
      .add("S1451", "isRegularExpression", "true")
      // to test parameters for eslint-based rules
      .add("S1192", "threshold", "4")
      .add("S2762", "threshold", "1");

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
      .restoreProfile(FileLocation.ofClasspath("/empty-js-profile.xml"));

    instantiateTemplateRule("js", "rules",
      "S124",
      "CommentRegexTest",
      "regularExpression=\".*TODO.*\";message=\"bad user\";flags=\"i\"");


    instantiateTemplateRule("ts", "rules",
      "S124",
      "CommentRegexTestTS",
      "regularExpression=\".*TODO.*\";message=\"bad user\";flags=\"i\"");
  }

  @Test
  public void ruling() throws Exception {
    runRulingTest(project, language, sourceDir, exclusions);
  }

  static void runRulingTest(String projectKey, String languageToAnalyze, String sources, List<String> exclusions) throws IOException {
    String languageToIgnore = "js".equals(languageToAnalyze) ? "ts" : "js";
    orchestrator.getServer().provisionProject(projectKey, projectKey);
    orchestrator.getServer().associateProjectToQualityProfile(projectKey, languageToAnalyze, "rules");
    orchestrator.getServer().associateProjectToQualityProfile(projectKey, languageToIgnore, "empty-profile");

    SonarScanner build = SonarScanner.create(FileLocation.of(sources).getFile())
      .setProjectKey(projectKey)
      .setProjectName(projectKey)
      .setProjectVersion("1")
      .setSourceDirs("./")
      .setSourceEncoding("utf-8")
      .setProperty("dump.old", FileLocation.of("src/test/expected/" + languageToAnalyze + "/" + projectKey).getFile().getAbsolutePath())
      .setProperty("dump.new", FileLocation.of("target/actual/" + languageToAnalyze + "/" + projectKey).getFile().getAbsolutePath())
      .setProperty("lits.differences", FileLocation.of("target/differences").getFile().getAbsolutePath())
      .setProperty("sonar.exclusions", String.join(",", exclusions))
      .setProperty("sonar.javascript.node.maxspace", "2048")
      .setProperty("sonar.javascript.maxFileSize", "4000")
      .setProperty("sonar.cpd.exclusions", "**/*")
      .setProperty("sonar.internal.analysis.failFast", "true");

    orchestrator.executeBuild(build);

    assertThat(new String(Files.readAllBytes(Paths.get("target/differences")), StandardCharsets.UTF_8)).isEmpty();
  }

  private static void instantiateTemplateRule(String language, String qualityProfile, String ruleTemplateKey, String instantiationKey, String params) {
    SonarClient sonarClient = orchestrator.getServer().adminWsClient();
    String keyPrefix = "ts".equals(language) ? "typescript:" : "javascript:";
    sonarClient.post("/api/rules/create", ImmutableMap.<String, Object>builder()
      .put("name", instantiationKey)
      .put("markdown_description", instantiationKey)
      .put("severity", "INFO")
      .put("status", "READY")
      .put("template_key", keyPrefix + ruleTemplateKey)
      .put("custom_key", instantiationKey)
      .put("prevent_reactivation", "true")
      .put("params", "name=\"" + instantiationKey + "\";key=\"" + instantiationKey + "\";markdown_description=\"" + instantiationKey + "\";" + params)
      .build());
    String post = sonarClient.get("api/qualityprofiles/search", "language", language, "qualityProfile", qualityProfile);

    Map rulesProfile = new Gson().fromJson(post, Map.class);
    String profileKey = ((List<Map>) rulesProfile.get("profiles")).stream()
      .findFirst().map(profileDescription -> (String) profileDescription.get("key")).orElse(null);

    if (profileKey != null) {
      String response = sonarClient.post("api/qualityprofiles/activate_rule", ImmutableMap.of(
        "profile_key", profileKey,
        "rule_key", keyPrefix + instantiationKey,
        "severity", "INFO",
        "params", ""));
      LOG.warn(response);
    } else {
      throw new IllegalStateException("Could not retrieve profile key : Template rule " + ruleTemplateKey + " has not been activated");
    }
  }

}
