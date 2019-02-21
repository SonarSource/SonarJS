/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2018 SonarSource SA
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
import com.google.common.io.Files;
import com.google.gson.Gson;
import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.SonarScanner;
import com.sonar.orchestrator.locator.FileLocation;
import com.sonar.orchestrator.locator.MavenLocation;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.Before;
import org.junit.ClassRule;
import org.junit.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.wsclient.SonarClient;
import org.sonarsource.analyzer.commons.ProfileGenerator;

import static org.assertj.core.api.Assertions.assertThat;

public class JavaScriptRulingTest {

  private static final Logger LOG = LoggerFactory.getLogger(JavaScriptRulingTest.class);
  private static final Gson GSON = new Gson();

  private static final String PROJECT_KEY = "project";

  @ClassRule
  public static Orchestrator orchestrator = Orchestrator.builderEnv()
    .setSonarVersion(System.getProperty("sonar.runtimeVersion", "LATEST_RELEASE"))
    .addPlugin(FileLocation.byWildcardMavenFilename(
      new File("../../sonar-javascript-plugin/target"), "sonar-javascript-plugin-*.jar"))
    .addPlugin(MavenLocation.of("org.sonarsource.sonar-lits-plugin", "sonar-lits-plugin", "0.8.0.1209"))
    .build();

  @Before
  public void setUp() throws Exception {
    ProfileGenerator.RulesConfiguration rulesConfiguration = new ProfileGenerator.RulesConfiguration()
      .add("S1451", "headerFormat", "// Copyright 20\\d\\d The Closure Library Authors. All Rights Reserved.")
      .add("S1451", "isRegularExpression", "true")
      // to test parameters for eslint-based rules
      .add("S1192", "threshold", "4")
      .add("S2762", "threshold", "1");
    Set<String> excludedRules = Collections.singleton("CommentRegularExpression");
    File profile = ProfileGenerator.generateProfile(orchestrator.getServer().getUrl(), "js", "javascript", rulesConfiguration, excludedRules);
    orchestrator.getServer().restoreProfile(FileLocation.of(profile));
  }

  @Test
  public void test() throws Exception {
    File litsDifferencesFile = FileLocation.of("target/differences").getFile();
    orchestrator.getServer().provisionProject("project", "project");
    orchestrator.getServer().associateProjectToQualityProfile("project", "js", "rules");
    SonarScanner build = SonarScanner.create(FileLocation.of("../sources/src").getFile())
      .setProjectKey(PROJECT_KEY)
      .setProjectName("project")
      .setProjectVersion("1")
      .setLanguage("js")
      .setSourceDirs("./")
      .setSourceEncoding("utf-8")
      .setProperty("dump.old", FileLocation.of("src/test/expected").getFile().getAbsolutePath())
      .setProperty("dump.new", FileLocation.of("target/actual").getFile().getAbsolutePath())
      .setProperty("lits.differences", litsDifferencesFile.getAbsolutePath())
      .setProperty("sonar.cpd.exclusions", "**/*")
      .setEnvironmentVariable("SONAR_RUNNER_OPTS", "-Xmx1024m");

    instantiateTemplateRule("CommentRegularExpression", "CommentRegexTest", "regularExpression=\"(?i).*TODO.*\";message=\"bad user\"");

    orchestrator.executeBuild(build);

    assertThat(Files.toString(litsDifferencesFile, StandardCharsets.UTF_8)).isEmpty();
  }

  private static void instantiateTemplateRule(String ruleTemplateKey, String instantiationKey, String params) {
    SonarClient sonarClient = orchestrator.getServer().adminWsClient();
    sonarClient.post("/api/rules/create", ImmutableMap.<String, Object>builder()
      .put("name", instantiationKey)
      .put("markdown_description", instantiationKey)
      .put("severity", "INFO")
      .put("status", "READY")
      .put("template_key", "javascript:" + ruleTemplateKey)
      .put("custom_key", instantiationKey)
      .put("prevent_reactivation", "true")
      .put("params", "name=\"" + instantiationKey + "\";key=\"" + instantiationKey + "\";markdown_description=\"" + instantiationKey + "\";" + params)
      .build());
    String post = sonarClient.get("api/qualityprofiles/search?projectKey=" + PROJECT_KEY);

    String profileKey = null;
    Map profilesForProject = GSON.fromJson(post, Map.class);
    for (Map profileDescription : (List<Map>) profilesForProject.get("profiles")) {
      if ("rules".equals(profileDescription.get("name"))) {
        profileKey = (String) profileDescription.get("key");
        break;
      }
    }

    if (profileKey != null) {
      String response = sonarClient.post("api/qualityprofiles/activate_rule", ImmutableMap.of(
        "profile_key", profileKey,
        "rule_key", "javascript:" + instantiationKey,
        "severity", "INFO",
        "params", ""));
      LOG.warn(response);

    } else {
      LOG.error("Could not retrieve profile key : Template rule " + ruleTemplateKey + " has not been activated");
    }
  }

}
