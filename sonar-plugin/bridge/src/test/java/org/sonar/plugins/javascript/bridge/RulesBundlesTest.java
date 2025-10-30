/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
package org.sonar.plugins.javascript.bridge;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.slf4j.event.Level;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;
import org.sonar.plugins.javascript.api.RulesBundle;

class RulesBundlesTest {

  @TempDir
  Path tempDir;

  @RegisterExtension
  public LogTesterJUnit5 logTester = new LogTesterJUnit5().setLevel(Level.DEBUG);

  @Test
  void test_not_exists() {
    RulesBundle[] missingBundle = { new TestRulesBundle("missing.tgz") };
    assertThatThrownBy(() -> new RulesBundles(missingBundle)).isInstanceOf(
      IllegalStateException.class
    );
  }

  @Test
  void test_empty() {
    RulesBundles rulesBundles = new RulesBundles();
    assertThat(rulesBundles.deploy(tempDir)).isEmpty();
  }

  @Test
  void test_deploy_should_log_deployment_in_debug() {
    String filename = "/test-bundle.tgz";
    TestRulesBundle rulesBundle = new TestRulesBundle(filename);
    RulesBundles rulesBundles = new RulesBundles(new TestRulesBundle[] { rulesBundle });
    rulesBundles.deploy(tempDir);
    assertThat(logTester.logs(Level.DEBUG)).hasSize(1);
    assertThat(logTester.logs(Level.DEBUG).get(0)).startsWith("Deploying custom rules bundle");
    assertThat(logTester.logs(Level.DEBUG).get(0)).contains(filename);
  }

  static class TestRulesBundle implements RulesBundle {

    final String bundle;

    TestRulesBundle(String bundle) {
      this.bundle = bundle;
    }

    @Override
    public String bundlePath() {
      return bundle;
    }
  }
}
