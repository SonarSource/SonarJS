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
    assertThatThrownBy(() -> new RulesBundles(missingBundle))
      .isInstanceOf(IllegalStateException.class);
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
    assertThat(logTester.logs(Level.DEBUG).get(0))
      .startsWith("Deploying custom rules bundle");
    assertThat(logTester.logs(Level.DEBUG).get(0)).contains(filename);
  }

  @Test
  void test_get_ucfg_bundle() {
    TestRulesBundle rulesBundle = new TestRulesBundle("/test-bundle.tgz");
    TestUcfgRulesBundle ucfgRulesBundle = new TestUcfgRulesBundle("/test-bundle.tgz");

    RulesBundles rulesBundles = new RulesBundles(new TestRulesBundle[] { rulesBundle });
    assertThat(rulesBundles.getUcfgRulesBundle()).isEmpty();

    rulesBundles = new RulesBundles(new TestUcfgRulesBundle[] { ucfgRulesBundle });
    assertThat(rulesBundles.getUcfgRulesBundle()).contains(ucfgRulesBundle);
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

  static class TestUcfgRulesBundle implements RulesBundle {

    final String bundle;

    TestUcfgRulesBundle(String bundle) {
      this.bundle = bundle;
    }

    @Override
    public String bundleKey() {
      return "ucfg";
    }

    @Override
    public String bundleVersion() {
      return "some_bundle_version";
    }

    @Override
    public String bundlePath() {
      return bundle;
    }
  }
}
