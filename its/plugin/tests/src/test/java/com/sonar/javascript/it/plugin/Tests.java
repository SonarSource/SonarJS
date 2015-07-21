/*
 * Copyright (C) 2012-2014 SonarSource SA
 * All rights reserved
 * mailto:contact AT sonarsource DOT com
 */
package com.sonar.javascript.it.plugin;

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.OrchestratorBuilder;
import com.sonar.orchestrator.build.SonarRunner;
import com.sonar.orchestrator.locator.FileLocation;
import com.sonar.orchestrator.version.Version;
import org.junit.ClassRule;
import org.junit.runner.RunWith;
import org.junit.runners.Suite;

@RunWith(Suite.class)
@Suite.SuiteClasses({
  BigProjectTest.class,
  MetricsTest.class,
  UnitTestTest.class,
  CustomRulesTests.class,
  CoverageTest.class
})
public final class Tests {

  private static final String PLUGIN_KEY = "javascript";
  private static final String CUSTOM_RULES_ARTIFACT_ID = "javascript-custom-rules-plugin";

  @ClassRule
  public static final Orchestrator ORCHESTRATOR;
  static {
   OrchestratorBuilder orchestratorBuilder = Orchestrator.builderEnv()
      .addPlugin(PLUGIN_KEY)
      .setMainPluginKey(PLUGIN_KEY);

    // Add plugin & profile for custom rules
    if (Version.create(Orchestrator.builderEnv().getPluginVersion(PLUGIN_KEY)).isGreaterThan("2.5")) {
      orchestratorBuilder
        .restoreProfileAtStartup(FileLocation.ofClasspath("/profile-javascript-custom-rules.xml"))
        .addPlugin(FileLocation.of(TestUtils.pluginJar(CUSTOM_RULES_ARTIFACT_ID)));
    }

    ORCHESTRATOR = orchestratorBuilder.build();
  }

  private Tests() {
  }

  public static boolean is_after_sonar_5_1() {
    return ORCHESTRATOR.getConfiguration().getSonarVersion().isGreaterThanOrEquals("5.1");
  }

  public static boolean is_strictly_after_plugin(String version) {
    return ORCHESTRATOR.getConfiguration().getPluginVersion(PLUGIN_KEY).isGreaterThan(version);
  }

  public static SonarRunner createSonarRunnerBuild() {
    SonarRunner build = SonarRunner.create();
    build.setProperty("sonar.exclusions", "**/ecmascript6/**, **/file-for-rules/**, **/frameworks/**");
    build.setSourceEncoding("UTF-8");
    return build;
  }


}
